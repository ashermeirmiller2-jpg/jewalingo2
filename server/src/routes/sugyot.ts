import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireUser } from '../middleware/auth.js';
import { checkCoverage } from '../services/coverage.js';
import { getRefText } from '../services/sefaria.js';

export const sugyotRouter = Router();

sugyotRouter.get('/sugyot', async (_req, res) => {
  const sugyot = await prisma.taggedSugya.findMany({
    where: { verified: true },
    select: { id: true, ref: true, tractate: true, title: true, aggadita: true },
    orderBy: [{ aggadita: 'asc' }, { tractate: 'asc' }], // aggadita is lowest priority
  });
  res.json(sugyot);
});

/** The OUTSIDE: the sugya's argument graph, English only. */
sugyotRouter.get('/sugyot/:id/graph', async (req, res) => {
  const sugya = await prisma.taggedSugya.findFirst({
    where: { id: req.params.id, verified: true },
    include: { nodes: { include: { moveType: true }, orderBy: { order: 'asc' } }, edges: true },
  });
  if (!sugya) {
    res.status(404).json({ error: 'sugya not found' });
    return;
  }
  res.json({
    id: sugya.id,
    ref: sugya.ref,
    title: sugya.title,
    nodes: sugya.nodes.map((n) => ({
      id: n.id,
      moveType: {
        name: n.moveType.name,
        hebrewName: n.moveType.hebrewName,
        color: n.moveType.color,
        soWhat: n.moveType.soWhat,
        isQuestionType: n.moveType.isQuestionType,
      },
      englishGloss: n.englishGloss,
      spanRef: n.spanRef,
      order: n.order,
    })),
    edges: sugya.edges.map((e) => ({ fromId: e.fromId, toId: e.toId, relation: e.relation })),
  });
});

/**
 * The INSIDE span behind a node — verbatim CachedRef/Sefaria text, coverage-
 * gated (hard rules 1 + 3).
 */
sugyotRouter.get('/sugyot/:id/inside/:nodeId', requireUser, async (req, res) => {
  const node = await prisma.argumentNode.findFirst({
    where: { id: req.params.nodeId, sugyaId: req.params.id, sugya: { verified: true } },
  });
  if (!node) {
    res.status(404).json({ error: 'node not found' });
    return;
  }
  const text = await getRefText(node.spanRef);
  const cov = await checkCoverage(req.userId!, text.plain);
  if (!cov.ok) {
    res.status(403).json({
      error: 'coverage',
      coverage: cov.coverage,
      required: cov.required,
      missingWords: cov.missingWords,
    });
    return;
  }
  res.json({ ref: text.ref, vowel: text.vowel, plain: text.plain });
});

/** Obsidian-style logic links (verified suggestions only). */
sugyotRouter.get('/sugyot/:id/links', async (req, res) => {
  const links = await prisma.sugyaLink.findMany({
    where: { fromId: req.params.id, verified: true },
    include: { to: { select: { id: true, ref: true, title: true } } },
  });
  res.json(links.map((l) => ({ toSugya: l.to, pattern: l.pattern })));
});
