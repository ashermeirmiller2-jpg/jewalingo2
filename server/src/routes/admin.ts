/**
 * Admin verification UI backend — the human-in-the-loop that flips `verified`.
 * Load-bearing, not optional (hard rule 2): the AI proposes, a human disposes.
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../middleware/auth.js';
import {
  classifySugyaMoves,
  generateExplainer,
  generateMcQuestions,
} from '../services/claude.js';
import { getRefText, stripNikud, verifyTextAgainstRef } from '../services/sefaria.js';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

// ───────────────────────────── P2: pairs ────────────────────────────────────

adminRouter.get('/admin/pairs', async (req, res) => {
  const verified = req.query.verified === 'true';
  const pairs = await prisma.formulaPair.findMany({
    where: { verified },
    include: { formulaA: true, formulaB: true, caseA: true, caseB: true },
    orderBy: { confidence: 'desc' },
    take: 200,
  });
  res.json(pairs);
});

adminRouter.post('/admin/pairs/:id/verify', async (req, res) => {
  const verified = Boolean(req.body?.verified);
  const pair = await prisma.formulaPair.update({
    where: { id: req.params.id },
    data: { verified },
  });
  if (verified) {
    // verifying a pair verifies its formulas and occurrences' formula link
    await prisma.formula.updateMany({
      where: { id: { in: [pair.formulaAId, pair.formulaBId] } },
      data: { verified: true },
    });
  }
  res.json(pair);
});

// ─────────────────── P2: discovery pipeline import ──────────────────────────

const ImportSchema = z.object({
  formulas: z.array(
    z.object({
      key: z.string(),
      skeleton: z.string(),
      category: z.enum([
        'ACQUISITION', 'CONDITIONAL', 'PRESUMPTION', 'INFERENCE', 'OBJECTION', 'AGENCY', 'COMPARISON', 'OTHER',
      ]),
      gloss: z.string().optional(),
      display: z.string().optional(),
    }),
  ),
  occurrences: z.array(
    z.object({
      formulaKey: z.string(),
      ref: z.string(),
      tractate: z.string(),
      daf: z.string(),
      textVowel: z.string(),
      textPlain: z.string(),
      sugyaRef: z.string(),
      caseCategory: z
        .enum(['MONETARY', 'MARITAL', 'RITUAL', 'DAMAGES', 'AGENCY', 'OTHER'])
        .default('OTHER'),
      slotFillings: z.record(z.string(), z.string()).optional(),
    }),
  ),
  pairs: z.array(
    z.object({
      formulaKey: z.string(),
      caseARef: z.string(),
      caseBRef: z.string(),
      distanceDaf: z.number(),
      outcomeContrast: z.boolean().default(false),
      contrastNotes: z.string().optional(),
      confidence: z.number().min(0).max(1),
    }),
  ),
});

adminRouter.post('/admin/import/candidates', async (req, res) => {
  const parsed = ImportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid import payload', details: parsed.error.flatten() });
    return;
  }
  const { formulas, occurrences, pairs } = parsed.data;

  const formulaIds = new Map<string, string>();
  for (const f of formulas) {
    const existing = await prisma.formula.findFirst({ where: { skeleton: f.skeleton } });
    const row =
      existing ??
      (await prisma.formula.create({
        data: {
          skeleton: f.skeleton,
          category: f.category,
          gloss: f.gloss,
          display: f.display,
          verified: false,
        },
      }));
    formulaIds.set(f.key, row.id);
  }

  const occIds = new Map<string, string>();
  const rejected: Array<{ ref: string; reason: string }> = [];
  for (const o of occurrences) {
    const formulaId = formulaIds.get(o.formulaKey);
    if (!formulaId) {
      rejected.push({ ref: o.ref, reason: `unknown formulaKey ${o.formulaKey}` });
      continue;
    }
    // HARD RULE 1: re-verify the imported text against Sefaria before storing.
    let ok = false;
    try {
      ok = await verifyTextAgainstRef(o.ref, o.textVowel);
    } catch (err) {
      rejected.push({ ref: o.ref, reason: `sefaria verification failed: ${String(err)}` });
      continue;
    }
    if (!ok) {
      rejected.push({ ref: o.ref, reason: 'text does not match Sefaria verbatim text' });
      continue;
    }
    const existing = await prisma.formulaOccurrence.findFirst({ where: { ref: o.ref, formulaId } });
    const row =
      existing ??
      (await prisma.formulaOccurrence.create({
        data: {
          formulaId,
          ref: o.ref,
          tractate: o.tractate,
          daf: o.daf,
          textVowel: o.textVowel,
          textPlain: stripNikud(o.textVowel),
          sugyaRef: o.sugyaRef,
          caseCategory: o.caseCategory,
          slotFillings: o.slotFillings ?? undefined,
        },
      }));
    occIds.set(o.ref, row.id);
  }

  let pairsCreated = 0;
  for (const p of pairs) {
    const formulaId = formulaIds.get(p.formulaKey);
    const caseAId = occIds.get(p.caseARef);
    const caseBId = occIds.get(p.caseBRef);
    if (!formulaId || !caseAId || !caseBId) continue;
    const exists = await prisma.formulaPair.findFirst({ where: { caseAId, caseBId } });
    if (exists) continue;
    await prisma.formulaPair.create({
      data: {
        caseAId,
        caseBId,
        formulaAId: formulaId,
        formulaBId: formulaId,
        distanceDaf: Math.round(p.distanceDaf),
        outcomeContrast: p.outcomeContrast,
        contrastNotes: p.contrastNotes,
        confidence: p.confidence,
        verified: false,
      },
    });
    pairsCreated++;
  }

  res.json({
    formulas: formulaIds.size,
    occurrences: occIds.size,
    pairs: pairsCreated,
    rejected,
  });
});

// ─────────────────────── P2: explainer generation ───────────────────────────

adminRouter.post('/admin/explainers/generate', async (req, res) => {
  const pairId = String(req.body?.pairId ?? '');
  const pair = await prisma.formulaPair.findUnique({
    where: { id: pairId },
    include: { caseA: true, caseB: true, formulaA: true },
  });
  if (!pair) {
    res.status(404).json({ error: 'pair not found' });
    return;
  }
  const includeScript = process.env.ENABLE_VIDEO_EXPLAINERS === 'true';

  const makeFor = async (occ: { ref: string }, side: 'A' | 'B') => {
    const text = await getRefText(occ.ref);
    const gen = await generateExplainer({
      ref: occ.ref,
      caseEnglish: text.enText ?? '',
      formulaGloss: pair.formulaA.gloss ?? pair.formulaA.skeleton,
      includeScript,
    });
    const explainer = await prisma.explainer.create({
      data: {
        ref: occ.ref,
        title: gen.title,
        mindmap: gen.mindmap,
        slides: gen.slides,
        script: gen.script,
        verified: false,
      },
    });
    await prisma.formulaPair.update({
      where: { id: pair.id },
      data: side === 'A' ? { explainerAId: explainer.id } : { explainerBId: explainer.id },
    });
    return explainer.id;
  };

  const [a, b] = [await makeFor(pair.caseA, 'A'), await makeFor(pair.caseB, 'B')];
  res.json({ explainerAId: a, explainerBId: b, verified: false });
});

adminRouter.post('/admin/explainers/:id/verify', async (req, res) => {
  const explainer = await prisma.explainer.update({
    where: { id: req.params.id },
    data: { verified: Boolean(req.body?.verified) },
  });
  res.json(explainer);
});

// ───────────────────────────── P4: sugyot ───────────────────────────────────

adminRouter.get('/admin/sugyot', async (req, res) => {
  const verified = req.query.verified === 'true';
  const sugyot = await prisma.taggedSugya.findMany({
    where: { verified },
    include: {
      nodes: { include: { moveType: true }, orderBy: { order: 'asc' } },
      edges: true,
      mcQuestions: true,
    },
  });
  res.json(sugyot);
});

adminRouter.post('/admin/sugyot/:id/verify', async (req, res) => {
  const sugya = await prisma.taggedSugya.update({
    where: { id: req.params.id },
    data: { verified: Boolean(req.body?.verified) },
  });
  res.json(sugya);
});

/**
 * Segment + tag a sugya: fetch spans from Sefaria, classify moves via Claude
 * (with formula/particle cues from the taxonomy), store the graph unverified.
 */
adminRouter.post('/admin/sugyot/tag', async (req, res) => {
  const { ref, title, tractate, spanRefs } = req.body ?? {};
  if (typeof ref !== 'string' || typeof title !== 'string' || typeof tractate !== 'string') {
    res.status(400).json({ error: 'expected { ref, title, tractate, spanRefs?: string[] }' });
    return;
  }
  const refs: string[] = Array.isArray(spanRefs) && spanRefs.length > 0 ? spanRefs : [ref];

  const spans = await Promise.all(
    refs.map(async (r: string) => {
      const t = await getRefText(r);
      return { ref: r, vowel: t.vowel, en: t.enText };
    }),
  );
  const moveTypes = await prisma.sugyaMoveType.findMany({
    select: { name: true, particle: true, description: true },
  });

  const tagged = await classifySugyaMoves({ spans, moveTypes });

  const moveByName = new Map(
    (await prisma.sugyaMoveType.findMany()).map((m) => [m.name.toLowerCase(), m]),
  );

  const sugya = await prisma.taggedSugya.upsert({
    where: { ref },
    create: { ref, title, tractate, verified: false },
    update: { title, tractate, verified: false },
  });
  // re-tagging replaces the previous candidate graph
  await prisma.argumentEdge.deleteMany({ where: { sugyaId: sugya.id } });
  await prisma.argumentNode.deleteMany({ where: { sugyaId: sugya.id } });

  const nodeIds: string[] = [];
  for (let i = 0; i < tagged.nodes.length; i++) {
    const n = tagged.nodes[i];
    const moveType = moveByName.get(n.moveType.toLowerCase());
    if (!moveType) continue;
    const node = await prisma.argumentNode.create({
      data: {
        sugyaId: sugya.id,
        moveTypeId: moveType.id,
        spanRef: spans[Math.min(n.spanIndex, spans.length - 1)].ref,
        englishGloss: n.englishGloss,
        order: i,
      },
    });
    nodeIds.push(node.id);
  }
  for (const e of tagged.edges) {
    if (nodeIds[e.fromIndex] == null || nodeIds[e.toIndex] == null) continue;
    await prisma.argumentEdge.create({
      data: {
        sugyaId: sugya.id,
        fromId: nodeIds[e.fromIndex],
        toId: nodeIds[e.toIndex],
        relation: e.relation,
      },
    });
  }

  // Obsidian-style auto-links: suggest connections to sugyot sharing the move
  // pattern signature. Suggestions only — verified=false until human review.
  const pattern = tagged.nodes.map((n) => n.moveType.toUpperCase()).join('>');
  const others = await prisma.taggedSugya.findMany({
    where: { id: { not: sugya.id } },
    include: { nodes: { include: { moveType: true }, orderBy: { order: 'asc' } } },
  });
  for (const other of others) {
    const otherPattern = other.nodes.map((n) => n.moveType.name.toUpperCase()).join('>');
    if (otherPattern && otherPattern === pattern) {
      await prisma.sugyaLink.upsert({
        where: { fromId_toId_pattern: { fromId: sugya.id, toId: other.id, pattern } },
        create: { fromId: sugya.id, toId: other.id, pattern, verified: false },
        update: {},
      });
    }
  }

  const result = await prisma.taggedSugya.findUnique({
    where: { id: sugya.id },
    include: { nodes: { include: { moveType: true } }, edges: true },
  });
  res.json(result);
});

// ───────────────────────────── P4: MC questions ─────────────────────────────

adminRouter.post('/admin/mc/generate', async (req, res) => {
  const sugyaId = String(req.body?.sugyaId ?? '');
  const sugya = await prisma.taggedSugya.findUnique({
    where: { id: sugyaId },
    include: { nodes: { include: { moveType: true }, orderBy: { order: 'asc' } }, edges: true },
  });
  if (!sugya) {
    res.status(404).json({ error: 'sugya not found' });
    return;
  }
  const idToIndex = new Map(sugya.nodes.map((n, i) => [n.id, i]));
  const gen = await generateMcQuestions({
    sugyaTitle: sugya.title,
    nodes: sugya.nodes.map((n, i) => ({
      index: i,
      moveType: n.moveType.name,
      englishGloss: n.englishGloss,
    })),
    edges: sugya.edges.map((e) => ({
      fromIndex: idToIndex.get(e.fromId) ?? 0,
      toIndex: idToIndex.get(e.toId) ?? 0,
      relation: e.relation,
    })),
  });

  const created = await Promise.all(
    gen.questions.map((q) =>
      prisma.mCQuestion.create({
        data: {
          sugyaId: sugya.id,
          spanRef: q.spanIndex != null ? sugya.nodes[q.spanIndex]?.spanRef : null,
          prompt: q.prompt,
          options: q.options,
          verified: false,
        },
      }),
    ),
  );
  res.json(created);
});

adminRouter.post('/admin/mc/:id/verify', async (req, res) => {
  const q = await prisma.mCQuestion.update({
    where: { id: req.params.id },
    data: { verified: Boolean(req.body?.verified) },
  });
  res.json(q);
});

// ───────────────────────────── P4: logic links ──────────────────────────────

adminRouter.post('/admin/links/:id/verify', async (req, res) => {
  const link = await prisma.sugyaLink.update({
    where: { id: req.params.id },
    data: { verified: Boolean(req.body?.verified) },
  });
  res.json(link);
});
