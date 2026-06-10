/**
 * Coverage service — enforces the 70% word-coverage rule SERVER-SIDE.
 * Never surface a sentence/case unless the user already knows >= 70% of its
 * words. Every route that serves Aramaic case text calls checkCoverage first.
 */
import { prisma } from '../lib/prisma.js';
import { stripNikud } from './sefaria.js';

export const COVERAGE_THRESHOLD = 0.7;

export interface CoverageResult {
  coverage: number;
  required: number;
  ok: boolean;
  totalWords: number;
  knownWords: number;
  missingWords: string[];
}

export function tokenizePlain(plainText: string): string[] {
  return stripNikud(plainText)
    .split(/\s+/)
    .map((w) => w.replace(/[^֐-׿]/g, ''))
    .filter((w) => w.length > 0);
}

export async function getKnownWordSet(userId: string): Promise<Set<string>> {
  const rows = await prisma.userWord.findMany({
    where: { userId },
    include: { word: { select: { plain: true } } },
  });
  return new Set(rows.map((r) => r.word.plain));
}

/**
 * Compute the user's coverage of a passage (plain, nikud-stripped text).
 * `allowNewWords` is the lesson's explicit new-word budget: words the lesson
 * itself introduces before they appear (P2 rule: any new word is introduced
 * first), so they don't count against coverage.
 */
export async function checkCoverage(
  userId: string,
  plainText: string,
  allowNewWords: string[] = [],
): Promise<CoverageResult> {
  const tokens = tokenizePlain(plainText);
  const known = await getKnownWordSet(userId);
  const allowed = new Set(allowNewWords.map((w) => stripNikud(w)));

  let knownCount = 0;
  const missing: string[] = [];
  for (const t of tokens) {
    if (known.has(t) || allowed.has(t)) knownCount++;
    else if (!missing.includes(t)) missing.push(t);
  }
  const coverage = tokens.length === 0 ? 1 : knownCount / tokens.length;
  return {
    coverage,
    required: COVERAGE_THRESHOLD,
    ok: coverage >= COVERAGE_THRESHOLD,
    totalWords: tokens.length,
    knownWords: knownCount,
    missingWords: missing,
  };
}

/** Mark words as learned for a user (after intro cards). */
export async function learnWords(userId: string, wordIds: string[]): Promise<void> {
  await prisma.userWord.createMany({
    data: wordIds.map((wordId) => ({ userId, wordId })),
    skipDuplicates: true,
  });
}
