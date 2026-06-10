/**
 * Flow assembly for the P2 learner experience: word metadata, Duolingo-style
 * exercises, and the 5-step pair flow payload.
 */
import type { FormulaOccurrence, Word } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { stripNikud } from './sefaria.js';

export interface WordInfo {
  vowel: string;
  plain: string;
  gloss: string;
  isFunction: boolean;
  functionColor: string | null;
  isNew: boolean;
  wordId: string | null;
}

const CONTENT_BAR_COLOR = '#b8b0a1'; // neutral bar for content words

export async function buildWordInfo(
  occurrence: Pick<FormulaOccurrence, 'textVowel' | 'textPlain'>,
  knownPlain: Set<string>,
): Promise<WordInfo[]> {
  const vowelTokens = occurrence.textVowel.split(/\s+/).filter(Boolean);
  const plainTokens = vowelTokens.map((t) => stripNikud(t));
  const words = await prisma.word.findMany({ where: { plain: { in: plainTokens } } });
  const byPlain = new Map<string, Word>(words.map((w) => [w.plain, w]));

  return vowelTokens.map((vowel, i) => {
    const plain = plainTokens[i];
    const word = byPlain.get(plain);
    return {
      vowel,
      plain,
      gloss: word?.gloss ?? '(new word)',
      isFunction: word?.isFunction ?? false,
      functionColor: word?.isFunction ? word.functionColor ?? '#c9a227' : CONTENT_BAR_COLOR,
      isNew: !knownPlain.has(plain),
      wordId: word?.id ?? null,
    };
  });
}

export interface Exercise {
  type: 'tapMatch' | 'reorder' | 'fillFunction';
  [key: string]: unknown;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Deterministic micro-exercises from the case's word metadata. */
export function buildExercises(words: WordInfo[]): Exercise[] {
  const exercises: Exercise[] = [];

  // tap-to-match: up to 5 word<->gloss pairs (prefer function words: the pattern is the lesson)
  const matchable = [...words.filter((w) => w.isFunction), ...words.filter((w) => !w.isFunction)]
    .filter((w) => w.gloss !== '(new word)')
    .slice(0, 5);
  if (matchable.length >= 3) {
    exercises.push({
      type: 'tapMatch',
      pairs: matchable.map((w) => ({ vowel: w.vowel, gloss: w.gloss })),
    });
  }

  // reorder: rebuild the sentence from shuffled tiles
  if (words.length >= 3 && words.length <= 14) {
    exercises.push({
      type: 'reorder',
      tiles: shuffle(words.map((w) => w.vowel)),
      answer: words.map((w) => w.vowel),
    });
  }

  // fill the missing function word
  const fnIndices = words.map((w, i) => (w.isFunction ? i : -1)).filter((i) => i >= 0);
  if (fnIndices.length > 0) {
    const blankIndex = fnIndices[Math.floor(fnIndices.length / 2)];
    const distractorPool = words.filter((w, i) => w.isFunction && i !== blankIndex).map((w) => w.vowel);
    const options = shuffle([words[blankIndex].vowel, ...shuffle([...new Set(distractorPool)]).slice(0, 3)]);
    exercises.push({
      type: 'fillFunction',
      blankIndex,
      sentence: words.map((w, i) => (i === blankIndex ? null : w.vowel)),
      options,
      answer: words[blankIndex].vowel,
    });
  }

  return exercises;
}

/** Word tiles for the lein challenge: the English of the case, shuffled. */
export function buildEnglishTiles(translation: string): string[] {
  return shuffle(
    translation
      .split(/\s+/)
      .map((t) => t.replace(/^["'.,;:!?]+|["'.,;:!?]+$/g, ''))
      .filter(Boolean),
  );
}
