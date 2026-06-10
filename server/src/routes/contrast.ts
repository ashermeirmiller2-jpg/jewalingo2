import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireUser } from '../middleware/auth.js';
import { recordReview } from '../services/reviewItems.js';

export const contrastRouter = Router();

/** Grade a near-miss contrast answer (2.6 deep layer). */
contrastRouter.post('/contrast/answer', requireUser, async (req, res) => {
  const { exerciseId, optionId } = req.body ?? {};
  if (typeof exerciseId !== 'string' || typeof optionId !== 'string') {
    res.status(400).json({ error: 'expected { exerciseId, optionId }' });
    return;
  }
  const exercise = await prisma.nearMissExercise.findFirst({
    where: { id: exerciseId, verified: true },
  });
  if (!exercise) {
    res.status(404).json({ error: 'exercise not found' });
    return;
  }
  const options = exercise.options as Array<{ id: string; text: string; correct: boolean }>;
  const chosen = options.find((o) => o.id === optionId);
  if (!chosen) {
    res.status(400).json({ error: 'unknown option' });
    return;
  }
  await recordReview(req.userId!, 'CONTRAST', exercise.id, chosen.correct ? 4 : 1);
  res.json({ correct: chosen.correct, explanation: exercise.explanation });
});
