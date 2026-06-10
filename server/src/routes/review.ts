import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireUser } from '../middleware/auth.js';
import { recordReview } from '../services/reviewItems.js';
import type { Rating } from '../services/fsrs.js';

export const reviewRouter = Router();

/** Unified FSRS queue across both products. */
reviewRouter.get('/review/queue', requireUser, async (req, res) => {
  const items = await prisma.reviewItem.findMany({
    where: { userId: req.userId!, due: { lte: new Date() } },
    orderBy: { due: 'asc' },
    take: 50,
  });

  const payloads = await Promise.all(
    items.map(async (item) => {
      switch (item.kind) {
        case 'FORMULA': {
          const f = await prisma.formula.findUnique({ where: { id: item.targetId } });
          return f
            ? { skeleton: f.skeleton, display: f.display, gloss: f.gloss, category: f.category }
            : null;
        }
        case 'LEIN': {
          const p = await prisma.formulaPair.findUnique({
            where: { id: item.targetId },
            include: { caseB: { select: { ref: true, tractate: true } } },
          });
          return p ? { pairId: p.id, caseBRef: p.caseB.ref, tractate: p.caseB.tractate } : null;
        }
        case 'CONTRAST': {
          const e = await prisma.nearMissExercise.findUnique({
            where: { id: item.targetId },
            select: { pairId: true, question: true },
          });
          return e ?? null;
        }
        case 'MC': {
          const q = await prisma.mCQuestion.findUnique({
            where: { id: item.targetId },
            select: { prompt: true, sugyaId: true },
          });
          return q ?? null;
        }
        case 'CLASS': {
          const c = await prisma.classLesson.findUnique({
            where: { id: item.targetId },
            select: { title: true },
          });
          return c ?? null;
        }
      }
    }),
  );

  res.json(
    items
      .map((item, i) => ({
        id: item.id,
        kind: item.kind,
        targetId: item.targetId,
        due: item.due,
        payload: payloads[i],
      }))
      .filter((x) => x.payload !== null),
  );
});

reviewRouter.post('/review/grade', requireUser, async (req, res) => {
  const { itemId, rating } = req.body ?? {};
  if (typeof itemId !== 'string' || ![1, 2, 3, 4].includes(rating)) {
    res.status(400).json({ error: 'expected { itemId, rating: 1|2|3|4 }' });
    return;
  }
  const item = await prisma.reviewItem.findFirst({ where: { id: itemId, userId: req.userId! } });
  if (!item) {
    res.status(404).json({ error: 'review item not found' });
    return;
  }
  const result = await recordReview(req.userId!, item.kind, item.targetId, rating as Rating);
  res.json(result);
});
