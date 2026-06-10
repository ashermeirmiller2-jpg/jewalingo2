/**
 * FSRS (Free Spaced Repetition Scheduler) — one scheduler over the unified
 * ReviewItem. Both P2 (formulas, lein challenges, contrast drills) and
 * P4 (MC questions, classes) enqueue here.
 *
 * Implementation of the FSRS-4.5 algorithm with default parameters.
 * Ratings: 1=Again, 2=Hard, 3=Good, 4=Easy.
 */

export type Rating = 1 | 2 | 3 | 4;
export type FsrsStateName = 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARNING';

export interface FsrsCard {
  state: FsrsStateName;
  stability: number;
  difficulty: number;
  due: Date;
  lastReview: Date | null;
  reps: number;
  lapses: number;
}

// FSRS-4.5 default weights.
const W = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367,
  1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755,
];

const REQUEST_RETENTION = 0.9;
const DECAY = -0.5;
const FACTOR = 19 / 81; // makes R(t=S) = 0.9

export function initialDifficulty(rating: Rating): number {
  return clampD(W[4] - (rating - 3) * W[5]);
}

export function initialStability(rating: Rating): number {
  return Math.max(W[rating - 1], 0.1);
}

function clampD(d: number): number {
  return Math.min(Math.max(d, 1), 10);
}

export function retrievability(elapsedDays: number, stability: number): number {
  return Math.pow(1 + FACTOR * (elapsedDays / stability), DECAY);
}

export function intervalForStability(stability: number): number {
  const ivl = (stability / FACTOR) * (Math.pow(REQUEST_RETENTION, 1 / DECAY) - 1);
  return Math.max(1, Math.round(ivl));
}

function nextDifficulty(d: number, rating: Rating): number {
  const dNext = d - W[6] * (rating - 3);
  // mean reversion toward initial-Good difficulty
  return clampD(W[7] * initialDifficulty(3) + (1 - W[7]) * dNext);
}

function nextRecallStability(d: number, s: number, r: number, rating: Rating): number {
  const hardPenalty = rating === 2 ? W[15] : 1;
  const easyBonus = rating === 4 ? W[16] : 1;
  return (
    s *
    (1 +
      Math.exp(W[8]) *
        (11 - d) *
        Math.pow(s, -W[9]) *
        (Math.exp(W[10] * (1 - r)) - 1) *
        hardPenalty *
        easyBonus)
  );
}

function nextForgetStability(d: number, s: number, r: number): number {
  return Math.min(
    W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r)),
    s,
  );
}

/** Apply a review at `now` with the given rating; returns the updated card. */
export function review(card: FsrsCard, rating: Rating, now: Date = new Date()): FsrsCard {
  const next: FsrsCard = { ...card, reps: card.reps + 1, lastReview: now };

  if (card.state === 'NEW') {
    next.difficulty = initialDifficulty(rating);
    next.stability = initialStability(rating);
    if (rating === 1) {
      next.state = 'LEARNING';
      next.due = addMinutes(now, 10);
    } else if (rating === 4) {
      next.state = 'REVIEW';
      next.due = addDays(now, intervalForStability(next.stability));
    } else {
      next.state = 'LEARNING';
      next.due = addMinutes(now, rating === 2 ? 30 : 60);
    }
    return next;
  }

  const elapsed = card.lastReview
    ? Math.max(0, (now.getTime() - card.lastReview.getTime()) / 86_400_000)
    : 0;
  const r = retrievability(elapsed, Math.max(card.stability, 0.1));

  if (card.state === 'LEARNING' || card.state === 'RELEARNING') {
    if (rating === 1) {
      next.due = addMinutes(now, 10);
    } else {
      next.state = 'REVIEW';
      next.stability = Math.max(card.stability, initialStability(rating));
      next.due = addDays(now, intervalForStability(next.stability));
    }
    return next;
  }

  // REVIEW state
  next.difficulty = nextDifficulty(card.difficulty, rating);
  if (rating === 1) {
    next.lapses = card.lapses + 1;
    next.stability = nextForgetStability(card.difficulty, card.stability, r);
    next.state = 'RELEARNING';
    next.due = addMinutes(now, 10);
  } else {
    next.stability = nextRecallStability(card.difficulty, card.stability, r, rating);
    next.due = addDays(now, intervalForStability(next.stability));
  }
  return next;
}

/** Map a graded exercise outcome to an FSRS rating. */
export function ratingFromVerdict(verdict: 'correct' | 'partial' | 'incorrect', hintsUsed = 0): Rating {
  if (verdict === 'incorrect') return 1;
  if (verdict === 'partial') return 2;
  return hintsUsed > 0 ? 3 : 4;
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}
function addMinutes(d: Date, mins: number): Date {
  return new Date(d.getTime() + mins * 60_000);
}
