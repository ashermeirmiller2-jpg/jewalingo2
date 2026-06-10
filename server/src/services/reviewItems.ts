import { prisma } from '../lib/prisma.js';
import { review, type FsrsCard, type Rating } from './fsrs.js';
import type { ReviewItemKind } from '@prisma/client';

/** Upsert the (user, kind, target) review item and apply an FSRS review. */
export async function recordReview(
  userId: string,
  kind: ReviewItemKind,
  targetId: string,
  rating: Rating,
): Promise<{ due: Date; state: string }> {
  const existing = await prisma.reviewItem.findUnique({
    where: { userId_kind_targetId: { userId, kind, targetId } },
  });
  const card: FsrsCard = existing
    ? {
        state: existing.state,
        stability: existing.stability,
        difficulty: existing.difficulty,
        due: existing.due,
        lastReview: existing.lastReview,
        reps: existing.reps,
        lapses: existing.lapses,
      }
    : { state: 'NEW', stability: 0, difficulty: 0, due: new Date(), lastReview: null, reps: 0, lapses: 0 };

  const next = review(card, rating);
  const data = {
    state: next.state,
    stability: next.stability,
    difficulty: next.difficulty,
    due: next.due,
    lastReview: next.lastReview,
    reps: next.reps,
    lapses: next.lapses,
  };
  await prisma.reviewItem.upsert({
    where: { userId_kind_targetId: { userId, kind, targetId } },
    create: { userId, kind, targetId, ...data },
    update: data,
  });
  return { due: next.due, state: next.state };
}
