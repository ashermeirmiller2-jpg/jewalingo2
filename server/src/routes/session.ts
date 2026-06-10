import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireUser } from '../middleware/auth.js';
import { learnWords } from '../services/coverage.js';

export const sessionRouter = Router();

/** Anonymous session — no signup, start-to-learning < 90s. */
sessionRouter.post('/session/anon', async (_req, res) => {
  const user = await prisma.user.create({ data: { anonymous: true } });
  res.json({ userId: user.id });
});

sessionRouter.get('/progress', requireUser, async (req, res) => {
  const [user, words] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: req.userId! } }),
    prisma.userWord.findMany({
      where: { userId: req.userId! },
      include: { word: true },
      orderBy: { learnedAt: 'desc' },
    }),
  ]);
  res.json({
    knownWordCount: words.length,
    words: words.map((uw) => ({
      plain: uw.word.plain,
      gloss: uw.word.gloss,
      isFunction: uw.word.isFunction,
      strength: uw.strength,
    })),
    outsideMastery: user.outsideMastery,
    streakDays: user.streakDays,
  });
});

sessionRouter.post('/words/learn', requireUser, async (req, res) => {
  const wordIds: unknown = req.body?.wordIds;
  if (!Array.isArray(wordIds) || wordIds.some((w) => typeof w !== 'string')) {
    res.status(400).json({ error: 'wordIds must be string[]' });
    return;
  }
  await learnWords(req.userId!, wordIds as string[]);
  res.json({ ok: true });
});
