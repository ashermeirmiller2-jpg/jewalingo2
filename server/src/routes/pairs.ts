import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireUser } from '../middleware/auth.js';
import { checkCoverage, getKnownWordSet } from '../services/coverage.js';
import { buildEnglishTiles, buildExercises, buildWordInfo } from '../services/flow.js';
import { stripNikud } from '../services/sefaria.js';

export const pairsRouter = Router();

const pairInclude = {
  formulaA: true,
  formulaB: true,
  caseA: true,
  caseB: true,
  explainerA: true,
  explainerB: true,
} as const;

pairsRouter.get('/pairs', async (req, res) => {
  const category = req.query.category as string | undefined;
  const top = Math.min(Number(req.query.top) || 50, 200);
  const pairs = await prisma.formulaPair.findMany({
    where: {
      verified: true,
      ...(category ? { formulaA: { category: category as never } } : {}),
    },
    include: pairInclude,
    orderBy: { confidence: 'desc' },
    take: top,
  });
  res.json(
    pairs.map((p) => ({
      id: p.id,
      formulaA: { skeleton: p.formulaA.skeleton, gloss: p.formulaA.gloss, category: p.formulaA.category },
      caseA: { ref: p.caseA.ref, tractate: p.caseA.tractate, caseCategory: p.caseA.caseCategory },
      caseB: { ref: p.caseB.ref, tractate: p.caseB.tractate, caseCategory: p.caseB.caseCategory },
      distanceDaf: p.distanceDaf,
      outcomeContrast: p.outcomeContrast,
    })),
  );
});

pairsRouter.get('/pairs/:id', async (req, res) => {
  const pair = await prisma.formulaPair.findFirst({
    where: { id: req.params.id, verified: true },
    include: pairInclude,
  });
  if (!pair) {
    res.status(404).json({ error: 'pair not found' });
    return;
  }
  res.json(pair);
});

/**
 * The 5-step learner flow. Coverage-gated server-side (hard rule 3):
 * the new words the lesson itself introduces (within the pair's budget) are
 * exempt, because step 2 introduces them before they appear.
 */
pairsRouter.get('/pairs/:id/flow', requireUser, async (req, res) => {
  const pair = await prisma.formulaPair.findFirst({
    where: { id: req.params.id, verified: true },
    include: pairInclude,
  });
  if (!pair) {
    res.status(404).json({ error: 'pair not found' });
    return;
  }

  const known = await getKnownWordSet(req.userId!);

  // Coverage gate: the lesson may explicitly introduce up to newWordBudget new
  // words (intro cards in step 2 / gloss hints in step 4) across both cases;
  // anything beyond that must already be known (70% rule, hard rule 3).
  const missingA = [...new Set(stripNikud(pair.caseA.textPlain).split(/\s+/))].filter(
    (w) => w && !known.has(w),
  );
  const missingB = [...new Set(stripNikud(pair.caseB.textPlain).split(/\s+/))].filter(
    (w) => w && !known.has(w) && !missingA.includes(w),
  );
  const introduced = [...missingA, ...missingB].slice(0, pair.newWordBudget);
  const coverageA = await checkCoverage(req.userId!, pair.caseA.textPlain, introduced);
  const coverageB = await checkCoverage(req.userId!, pair.caseB.textPlain, introduced);
  if (!coverageA.ok || !coverageB.ok) {
    const failed = !coverageA.ok ? coverageA : coverageB;
    res.status(403).json({
      error: 'coverage',
      coverage: failed.coverage,
      required: failed.required,
      missingWords: failed.missingWords,
    });
    return;
  }

  const knownPlusIntro = new Set(known);
  const wordsA = await buildWordInfo(pair.caseA, knownPlusIntro);
  for (const w of wordsA) knownPlusIntro.add(w.plain);
  const wordsB = await buildWordInfo(pair.caseB, knownPlusIntro);

  const acceptable = await prisma.acceptableTranslation.findMany({
    where: { occurrenceRef: pair.caseB.ref, verified: true },
  });
  const cachedB = await prisma.cachedRef.findUnique({ where: { ref: pair.caseB.ref } });
  const fullTranslation = acceptable[0]?.text ?? cachedB?.enText ?? '';

  const nearMisses = await prisma.nearMissExercise.findMany({
    where: { pairId: pair.id, verified: true },
    include: { baseFormula: true, variantFormula: true },
  });

  // function-word alignment for same-skeleton mode: pair identical function words
  const functionMatches: Array<[number, number]> = [];
  wordsA.forEach((wa, i) => {
    if (!wa.isFunction) return;
    const j = wordsB.findIndex(
      (wb, jj) => wb.isFunction && wb.plain === wa.plain && !functionMatches.some(([, m]) => m === jj),
    );
    if (j >= 0) functionMatches.push([i, j]);
  });

  const steps = [
    pair.explainerA?.verified
      ? {
          kind: 'explainerA',
          explainer: {
            title: pair.explainerA.title,
            mindmap: pair.explainerA.mindmap,
            slides: pair.explainerA.slides,
            script: process.env.ENABLE_VIDEO_EXPLAINERS === 'true' ? pair.explainerA.script : null,
          },
        }
      : null,
    {
      kind: 'insideA',
      occurrence: { ref: pair.caseA.ref, tractate: pair.caseA.tractate, textVowel: pair.caseA.textVowel },
      words: wordsA,
      skeleton: pair.formulaA.skeleton,
      skeletonGloss: pair.formulaA.gloss,
      exercises: buildExercises(wordsA),
    },
    pair.explainerB?.verified
      ? {
          kind: 'explainerB',
          explainer: {
            title: pair.explainerB.title,
            mindmap: pair.explainerB.mindmap,
            slides: pair.explainerB.slides,
            script: process.env.ENABLE_VIDEO_EXPLAINERS === 'true' ? pair.explainerB.script : null,
          },
        }
      : null,
    {
      kind: 'leinB',
      occurrence: { ref: pair.caseB.ref, tractate: pair.caseB.tractate, textVowel: pair.caseB.textVowel },
      tiles: fullTranslation ? buildEnglishTiles(fullTranslation) : [],
      hints: {
        functionBars: wordsB.map((w) => ({ isFunction: w.isFunction, functionColor: w.functionColor })),
        glosses: wordsB.map((w) => ({ vowel: w.vowel, gloss: w.gloss })),
        formulaReminder: `You saw this pattern in Case A (${pair.caseA.ref}): ${pair.formulaA.gloss ?? pair.formulaA.skeleton}`,
        fullTranslation,
      },
    },
    {
      kind: 'contrast',
      sameSkeleton: { wordsA, wordsB, functionMatches },
      nearMisses: nearMisses.map((nm) => ({
        id: nm.id,
        baseDisplay: nm.baseFormula.display ?? nm.baseFormula.skeleton,
        variantDisplay: nm.variantFormula.display ?? nm.variantFormula.skeleton,
        changedWord: nm.changedWord,
        question: nm.question,
        options: (nm.options as Array<{ id: string; text: string }>).map(({ id, text }) => ({ id, text })),
      })),
      outcomeContrast: pair.outcomeContrast,
      contrastNotes: pair.contrastNotes,
    },
  ].filter(Boolean);

  res.json({ pairId: pair.id, steps });
});
