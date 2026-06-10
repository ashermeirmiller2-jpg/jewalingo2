import { describe, expect, it } from 'vitest';
import {
  intervalForStability,
  ratingFromVerdict,
  retrievability,
  review,
  type FsrsCard,
} from './fsrs.js';

const newCard = (): FsrsCard => ({
  state: 'NEW',
  stability: 0,
  difficulty: 0,
  due: new Date('2026-01-01T00:00:00Z'),
  lastReview: null,
  reps: 0,
  lapses: 0,
});

describe('fsrs', () => {
  it('schedules a NEW card rated Easy straight into REVIEW with a future due date', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const next = review(newCard(), 4, now);
    expect(next.state).toBe('REVIEW');
    expect(next.due.getTime()).toBeGreaterThan(now.getTime() + 86_400_000 - 1);
    expect(next.reps).toBe(1);
  });

  it('keeps a NEW card rated Again in LEARNING with a minutes-scale due date', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const next = review(newCard(), 1, now);
    expect(next.state).toBe('LEARNING');
    expect(next.due.getTime() - now.getTime()).toBeLessThanOrEqual(11 * 60_000);
  });

  it('grows stability on successful review and shrinks on lapse', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    let card = review(newCard(), 3, now); // LEARNING
    card = review(card, 3, new Date(now.getTime() + 3_600_000)); // -> REVIEW
    const s1 = card.stability;
    const later = new Date(now.getTime() + 5 * 86_400_000);
    const good = review(card, 3, later);
    expect(good.stability).toBeGreaterThan(s1);
    const lapsed = review(card, 1, later);
    expect(lapsed.stability).toBeLessThanOrEqual(s1);
    expect(lapsed.state).toBe('RELEARNING');
    expect(lapsed.lapses).toBe(card.lapses + 1);
  });

  it('retrievability is 0.9 when elapsed equals stability', () => {
    expect(retrievability(10, 10)).toBeCloseTo(0.9, 5);
  });

  it('interval grows with stability', () => {
    expect(intervalForStability(20)).toBeGreaterThan(intervalForStability(5));
  });

  it('maps verdicts to ratings, penalizing hints', () => {
    expect(ratingFromVerdict('correct', 0)).toBe(4);
    expect(ratingFromVerdict('correct', 2)).toBe(3);
    expect(ratingFromVerdict('partial')).toBe(2);
    expect(ratingFromVerdict('incorrect')).toBe(1);
  });
});
