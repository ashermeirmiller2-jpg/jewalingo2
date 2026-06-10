import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireUser } from '../middleware/auth.js';
import { gradeFreeTranslation } from '../services/claude.js';
import { ratingFromVerdict } from '../services/fsrs.js';
import { recordReview } from '../services/reviewItems.js';

export const leinRouter = Router();

/**
 * Grade a lein attempt on Case B. Tile mode is graded locally against the
 * acceptance DB; free mode goes through Claude NLP grading against the same
 * acceptance set. Result feeds FSRS for this pair's lein challenge.
 */
leinRouter.post('/lein/grade', requireUser, async (req, res) => {
  const { pairId, mode, answer, hintsUsed = 0 } = req.body ?? {};
  if (typeof pairId !== 'string' || typeof answer !== 'string' || !['tiles', 'free'].includes(mode)) {
    res.status(400).json({ error: 'expected { pairId, mode: "tiles"|"free", answer, hintsUsed? }' });
    return;
  }

  const pair = await prisma.formulaPair.findFirst({
    where: { id: pairId, verified: true },
    include: { caseB: true, formulaB: true },
  });
  if (!pair) {
    res.status(404).json({ error: 'pair not found' });
    return;
  }

  const acceptable = await prisma.acceptableTranslation.findMany({
    where: { occurrenceRef: pair.caseB.ref, verified: true },
  });
  const cached = await prisma.cachedRef.findUnique({ where: { ref: pair.caseB.ref } });
  const acceptableTexts = acceptable.map((a) => a.text);
  if (acceptableTexts.length === 0 && cached?.enText) acceptableTexts.push(cached.enText);

  const normalize = (s: string) =>
    s.toLowerCase().replace(/["'.,;:!?()\[\]]/g, '').replace(/\s+/g, ' ').trim();

  let result: {
    verdict: 'correct' | 'partial' | 'incorrect';
    correctSpans: Array<[number, number]>;
    wrongSpans: Array<[number, number]>;
    pshatNote: string;
  };

  if (mode === 'tiles') {
    // tile mode: word-overlap grading against the acceptance set
    const answerWords = normalize(answer).split(' ').filter(Boolean);
    let best = 0;
    for (const t of acceptableTexts) {
      const target = new Set(normalize(t).split(' ').filter(Boolean));
      const hits = answerWords.filter((w) => target.has(w)).length;
      best = Math.max(best, answerWords.length ? hits / Math.max(target.size, answerWords.length) : 0);
    }
    const verdict = best >= 0.85 ? 'correct' : best >= 0.5 ? 'partial' : 'incorrect';
    result = {
      verdict,
      correctSpans: verdict === 'correct' ? [[0, answer.length]] : [],
      wrongSpans: verdict === 'incorrect' ? [[0, answer.length]] : [],
      pshatNote:
        verdict === 'correct'
          ? 'You leined it — same formula, new sugya.'
          : 'Compare your tiles to the formula you learned in Case A.',
    };
  } else {
    result = await gradeFreeTranslation({
      aramaicVowel: pair.caseB.textVowel,
      learnerAnswer: answer,
      acceptableTranslations: acceptableTexts,
      formulaGloss: pair.formulaB.gloss ?? undefined,
    });
  }

  const rating = ratingFromVerdict(result.verdict, Number(hintsUsed) || 0);
  await recordReview(req.userId!, 'LEIN', pair.id, rating);
  // a successful lein also reinforces the formula itself
  if (result.verdict !== 'incorrect') {
    await recordReview(req.userId!, 'FORMULA', pair.formulaBId, rating);
  }

  res.json(result);
});
