import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireUser } from '../middleware/auth.js';

export const visualRouter = Router();

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Visual reasoning training (4.6): the learner reconstructs the sugya's logic
 * from shuffled nodes — the off-ramp toward leining the OUTSIDE unaided.
 * Edges are withheld; the learner draws them and checks.
 */
visualRouter.get('/visual/:sugyaId', async (req, res) => {
  const sugya = await prisma.taggedSugya.findFirst({
    where: { id: req.params.sugyaId, verified: true },
    include: { nodes: { include: { moveType: true } } },
  });
  if (!sugya) {
    res.status(404).json({ error: 'sugya not found' });
    return;
  }
  const moveTypes = await prisma.sugyaMoveType.findMany({
    select: { name: true, color: true, description: true },
  });
  res.json({
    sugyaId: sugya.id,
    title: sugya.title,
    nodes: shuffle(
      sugya.nodes.map((n) => ({
        id: n.id,
        englishGloss: n.englishGloss,
        moveTypeName: n.moveType.name,
        moveTypeColor: n.moveType.color,
      })),
    ),
    moveTypes,
    relations: ['OBJECTS_TO', 'RESOLVES', 'PROVES', 'REFUTES', 'CONCLUDES', 'DEPENDS_ON', 'RESPONDS_TO'],
  });
});

/** Check a learner-built graph against the verified graph. */
visualRouter.post('/visual/check', requireUser, async (req, res) => {
  const { sugyaId, edges } = req.body ?? {};
  if (typeof sugyaId !== 'string' || !Array.isArray(edges)) {
    res.status(400).json({ error: 'expected { sugyaId, edges: [{fromId,toId,relation}] }' });
    return;
  }
  const sugya = await prisma.taggedSugya.findFirst({
    where: { id: sugyaId, verified: true },
    include: { edges: true },
  });
  if (!sugya) {
    res.status(404).json({ error: 'sugya not found' });
    return;
  }

  const key = (e: { fromId: string; toId: string; relation: string }) =>
    `${e.fromId}>${e.toId}:${e.relation}`;
  const truth = new Set(sugya.edges.map(key));
  const submitted = new Set(
    (edges as Array<{ fromId: string; toId: string; relation: string }>).map(key),
  );

  const missing = sugya.edges.filter((e) => !submitted.has(key(e)));
  const wrong = (edges as Array<{ fromId: string; toId: string; relation: string }>).filter(
    (e) => !truth.has(key(e)),
  );
  const correctCount = sugya.edges.length - missing.length;
  const score = sugya.edges.length === 0 ? 1 : Math.max(0, correctCount - wrong.length * 0.5) / sugya.edges.length;

  res.json({
    score: Math.round(score * 100) / 100,
    missing: missing.map((e) => ({ fromId: e.fromId, toId: e.toId, relation: e.relation })),
    wrong,
  });
});
