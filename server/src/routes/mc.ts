import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireUser } from '../middleware/auth.js';
import { recordReview } from '../services/reviewItems.js';
import { getRefText } from '../services/sefaria.js';

export const mcRouter = Router();

/** Next "what happened?" question: due review first, then unseen. */
mcRouter.get('/mc/next', requireUser, async (req, res) => {
  const due = await prisma.reviewItem.findFirst({
    where: { userId: req.userId!, kind: 'MC', due: { lte: new Date() } },
    orderBy: { due: 'asc' },
  });
  let question = due
    ? await prisma.mCQuestion.findFirst({ where: { id: due.targetId, verified: true } })
    : null;

  if (!question) {
    const seen = await prisma.reviewItem.findMany({
      where: { userId: req.userId!, kind: 'MC' },
      select: { targetId: true },
    });
    question = await prisma.mCQuestion.findFirst({
      where: { verified: true, sugya: { verified: true }, id: { notIn: seen.map((s) => s.targetId) } },
    });
  }
  if (!question) {
    res.json({ done: true });
    return;
  }

  let spanText: { vowel: string } | null = null;
  if (question.spanRef) {
    try {
      const t = await getRefText(question.spanRef);
      spanText = { vowel: t.vowel };
    } catch {
      spanText = null;
    }
  }
  const options = (question.options as Array<{ id: string; text: string }>).map(({ id, text }) => ({
    id,
    text,
  }));
  res.json({ id: question.id, prompt: question.prompt, spanText, options });
});

mcRouter.post('/mc/answer', requireUser, async (req, res) => {
  const { questionId, optionId } = req.body ?? {};
  if (typeof questionId !== 'string' || typeof optionId !== 'string') {
    res.status(400).json({ error: 'expected { questionId, optionId }' });
    return;
  }
  const question = await prisma.mCQuestion.findFirst({ where: { id: questionId, verified: true } });
  if (!question) {
    res.status(404).json({ error: 'question not found' });
    return;
  }
  const options = question.options as Array<{ id: string; text: string; correct: boolean }>;
  const correctOption = options.find((o) => o.correct);
  const chosen = options.find((o) => o.id === optionId);
  if (!chosen || !correctOption) {
    res.status(400).json({ error: 'unknown option' });
    return;
  }

  await recordReview(req.userId!, 'MC', question.id, chosen.correct ? 4 : 1);

  // OUTSIDE mastery: exponential moving average of MC performance
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });
  const alpha = 0.1;
  await prisma.user.update({
    where: { id: user.id },
    data: { outsideMastery: user.outsideMastery * (1 - alpha) + (chosen.correct ? 1 : 0) * alpha },
  });

  res.json({ correct: chosen.correct, correctOptionId: correctOption.id });
});
