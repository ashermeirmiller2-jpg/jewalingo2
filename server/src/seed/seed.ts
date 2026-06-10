/**
 * Seed script.
 *
 * 1. Lexicon: the high-frequency function-word core (dictionary data).
 * 2. P4 move taxonomy (4.1).
 * 3. The CONFIRMED P2 seed pair — BM 10a <-> Gittin 11b, formula
 *    זָכִין לְאָדָם שֶׁלֹּא בְּפָנָיו (skeleton string supplied in the product brief).
 *    ALL Aramaic passage text is fetched verbatim from Sefaria at seed time
 *    (hard rule 1) — this script stores nothing it did not fetch, except the
 *    brief-supplied formula skeleton itself.
 * 4. Hand-authored English explainers / near-miss exercise / question-type
 *    classes for the seed pair (human-confirmed -> verified=true).
 * 5. A starter tagged sugya + MC questions for the seed daf (human-confirmed
 *    seed corpus -> verified=true).
 *
 * Requires network access to sefaria.org. If Sefaria is unreachable the
 * lexicon + taxonomy still seed; the pair seeding aborts with a clear message.
 */
import { prisma } from '../lib/prisma.js';
import { stripNikud, stripHtml } from '../services/sefaria.js';
import { CORE_FUNCTION_WORDS, FUNCTION_COLORS } from './functionWords.js';
import { MOVE_TYPES } from './moveTypes.js';

// Formula skeleton as supplied (vowelized) in the product brief.
const SEED_FORMULA_VOWEL = 'זָכִין לְאָדָם שֶׁלֹּא בְּפָנָיו';
const SEED_FORMULA_PLAIN = stripNikud(SEED_FORMULA_VOWEL); // זכין לאדם שלא בפניו

interface Segment {
  ref: string;
  vowel: string;
  plain: string;
  en: string | null;
}

async function fetchAmud(tractate: string, daf: string): Promise<Segment[]> {
  const ref = `${tractate} ${daf}`;
  const url = `https://www.sefaria.org/api/v3/texts/${encodeURIComponent(ref)}?version=source&version=english&return_format=default`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Jewoulingo/0.1 (educational)' } });
  if (!res.ok) throw new Error(`Sefaria ${res.status} for ${ref}`);
  const data = (await res.json()) as {
    versions: Array<{ language: string; text: string | string[] }>;
  };
  const source = data.versions.find((v) => v.language === 'he');
  const english = data.versions.find((v) => v.language === 'en');
  const heSegs = (Array.isArray(source?.text) ? source.text : [source?.text ?? '']).map((s) =>
    stripHtml(String(s ?? '')),
  );
  const enSegs = Array.isArray(english?.text) ? english.text : [];
  return heSegs.map((vowel, i) => ({
    ref: `${ref}:${i + 1}`,
    vowel,
    plain: stripNikud(vowel),
    en: enSegs[i] ? stripHtml(String(enSegs[i])) : null,
  }));
}

/** Cache a segment as the verbatim source of truth for its ref. */
async function cacheSegment(seg: Segment): Promise<void> {
  await prisma.cachedRef.upsert({
    where: { ref: seg.ref },
    create: { ref: seg.ref, vowel: seg.vowel, plain: seg.plain, enText: seg.en },
    update: {},
  });
}

function findSegment(segments: Segment[], phrases: string[]): Segment | null {
  for (const phrase of phrases) {
    const hit = segments.find((s) => s.plain.includes(phrase));
    if (hit) return hit;
  }
  return null;
}

/** Extract the verbatim vowelized span matching a plain phrase, if present. */
function extractVowelSpan(vowelText: string, plainPhrase: string): string | null {
  const vTokens = vowelText.split(/\s+/).filter(Boolean);
  const pTokens = vTokens.map((t) => stripNikud(t));
  const phrase = plainPhrase.split(/\s+/).filter(Boolean);
  for (let i = 0; i + phrase.length <= pTokens.length; i++) {
    if (phrase.every((w, j) => pTokens[i + j] === w)) {
      return vTokens.slice(i, i + phrase.length).join(' ');
    }
  }
  return null;
}

async function seedLexicon(): Promise<void> {
  console.log('Seeding lexicon…');
  let rank = 1;
  for (const w of CORE_FUNCTION_WORDS) {
    await prisma.word.upsert({
      where: { plain: w.plain },
      create: {
        plain: w.plain,
        gloss: w.gloss,
        altGlosses: w.altGlosses ?? [],
        isFunction: true,
        frequencyRank: rank,
        functionColor: FUNCTION_COLORS[w.role],
      },
      update: { gloss: w.gloss, functionColor: FUNCTION_COLORS[w.role] },
    });
    rank++;
  }
  console.log(`  ${CORE_FUNCTION_WORDS.length} core words`);
}

async function seedMoveTypes(): Promise<void> {
  console.log('Seeding P4 move taxonomy…');
  for (const m of MOVE_TYPES) {
    await prisma.sugyaMoveType.upsert({
      where: { name: m.name },
      create: {
        name: m.name,
        hebrewName: m.hebrewName,
        particle: m.particle,
        description: m.description,
        soWhat: m.soWhat,
        color: m.color,
        isQuestionType: m.isQuestionType,
        demandsResolution: m.demandsResolution,
      },
      update: { description: m.description, soWhat: m.soWhat, color: m.color },
    });
  }
  console.log(`  ${MOVE_TYPES.length} move types`);
}

/** Ensure every word of a passage exists in the lexicon (as content words if unknown). */
async function ensureWords(plainText: string, glossFromEn: string): Promise<void> {
  const tokens = [...new Set(plainText.split(/\s+/).filter(Boolean))];
  for (const t of tokens) {
    await prisma.word.upsert({
      where: { plain: t },
      create: { plain: t, gloss: `(content word — see: ${glossFromEn.slice(0, 60)}…)`, isFunction: false },
      update: {},
    });
  }
}

async function seedPair(): Promise<void> {
  console.log('Seeding confirmed P2 pair (BM 10a <-> Gittin 11b)…');

  // search windows around the brief's dapim — the formula phrase must be
  // located in the verbatim text, never assumed
  const bmSegments = (
    await Promise.all([fetchAmud('Bava Metzia', '10a'), fetchAmud('Bava Metzia', '10b')])
  ).flat();
  const gitSegments = (
    await Promise.all([fetchAmud('Gittin', '11b'), fetchAmud('Gittin', '12a')])
  ).flat();

  const caseASeg = findSegment(bmSegments, [
    SEED_FORMULA_PLAIN,
    'זכין שלא בפניו',
    'תופס לבעל חוב',
    'זכין',
  ]);
  const caseBSeg = findSegment(gitSegments, [
    SEED_FORMULA_PLAIN,
    'זכין שלא בפניו',
    'זכות הוא לעבד',
    'זכין',
  ]);
  if (!caseASeg || !caseBSeg) {
    throw new Error(
      'Could not locate the seed formula in BM 10a-10b / Gittin 11b-12a — inspect the fetched text and adjust the search phrases.',
    );
  }
  console.log(`  Case A: ${caseASeg.ref}`);
  console.log(`  Case B: ${caseBSeg.ref}`);
  for (const seg of [...bmSegments, ...gitSegments]) await cacheSegment(seg);

  await ensureWords(caseASeg.plain, caseASeg.en ?? 'Bava Metzia 10a');
  await ensureWords(caseBSeg.plain, caseBSeg.en ?? 'Gittin 11b');

  // the formula, displayed with the verbatim span when present in the text
  const displayA = extractVowelSpan(caseASeg.vowel, SEED_FORMULA_PLAIN);
  const displayB = extractVowelSpan(caseBSeg.vowel, SEED_FORMULA_PLAIN);
  const formula = await prisma.formula.upsert({
    where: { id: 'seed-formula-zakhin' },
    create: {
      id: 'seed-formula-zakhin',
      skeleton: 'זכין ל{X} שלא בפניו',
      display: displayA ?? displayB ?? SEED_FORMULA_VOWEL,
      category: 'ACQUISITION',
      gloss: 'one may act to effect a benefit for a person in his absence',
      verified: true,
    },
    update: {},
  });

  const occA = await prisma.formulaOccurrence.upsert({
    where: { id: 'seed-occ-bm10a' },
    create: {
      id: 'seed-occ-bm10a',
      formulaId: formula.id,
      ref: caseASeg.ref,
      tractate: 'Bava Metzia',
      daf: '10a',
      textVowel: caseASeg.vowel,
      textPlain: caseASeg.plain,
      sugyaRef: 'Bava Metzia 10a',
      caseCategory: 'MONETARY',
    },
    update: {},
  });
  const occB = await prisma.formulaOccurrence.upsert({
    where: { id: 'seed-occ-git11b' },
    create: {
      id: 'seed-occ-git11b',
      formulaId: formula.id,
      ref: caseBSeg.ref,
      tractate: 'Gittin',
      daf: '11b',
      textVowel: caseBSeg.vowel,
      textPlain: caseBSeg.plain,
      sugyaRef: 'Gittin 11b',
      caseCategory: 'MONETARY',
    },
    update: {},
  });

  // Hand-authored OUTSIDE explainers (English only; confirmed seed content).
  const explainerA = await prisma.explainer.upsert({
    where: { id: 'seed-explainer-a' },
    create: {
      id: 'seed-explainer-a',
      ref: occA.ref,
      title: 'Case A — Grabbing on behalf of a creditor (Bava Metzia 10a)',
      mindmap: {
        nodes: [
          { id: 'f1', label: 'A debtor owes money to several creditors', kind: 'fact', x: 120, y: 80 },
          { id: 'f2', label: 'A third party seizes the debtor’s property for ONE creditor', kind: 'fact', x: 420, y: 80 },
          { id: 'q1', label: 'Does the seizure work — has that creditor acquired it?', kind: 'question', x: 270, y: 220 },
          { id: 't1', label: 'Acting for him = a benefit. But every other creditor LOSES.', kind: 'tension', x: 270, y: 340 },
          { id: 'fm1', label: 'Formula: one may effect a benefit for a person in his absence', kind: 'formula', x: 80, y: 460 },
          { id: 'o1', label: 'Outcome here: the seizure FAILS — you cannot benefit one person by harming others', kind: 'outcome', x: 480, y: 460 },
        ],
        edges: [
          { from: 'f1', to: 'q1', label: 'setup' },
          { from: 'f2', to: 'q1', label: 'setup' },
          { from: 'q1', to: 't1', label: 'raises' },
          { from: 't1', to: 'fm1', label: 'invokes' },
          { from: 'fm1', to: 'o1', label: 'fails here' },
        ],
      },
      slides: [
        { title: 'The setup', body: 'A debtor owes money to several creditors. There is not enough to pay them all.', emphasis: null },
        { title: 'The act', body: 'A bystander grabs the debtor’s property on behalf of one creditor — without being appointed.', emphasis: null },
        { title: 'The question', body: 'Did it work? Can you acquire for someone who never asked you to?', emphasis: 'Acting for an absent person' },
        { title: 'The principle', body: 'There is a rule: one may effect a BENEFIT for a person in his absence. A pure gain doesn’t need consent.', emphasis: 'benefit, in absence' },
        { title: 'The twist', body: 'Here, helping one creditor HARMS the others — the same act is a benefit and a detriment at once.', emphasis: null },
        { title: 'The outcome', body: 'The formula fails: where acting for one party disadvantages others, the seizure does not acquire.', emphasis: 'The formula fails here' },
      ],
      script: null,
      verified: true,
    },
    update: {},
  });

  const explainerB = await prisma.explainer.upsert({
    where: { id: 'seed-explainer-b' },
    create: {
      id: 'seed-explainer-b',
      ref: occB.ref,
      title: 'Case B — Receiving a document of release (Gittin 11b)',
      mindmap: {
        nodes: [
          { id: 'f1', label: 'A document grants a person his release / a clear gain', kind: 'fact', x: 120, y: 80 },
          { id: 'f2', label: 'A third party receives it on his behalf — he is absent', kind: 'fact', x: 420, y: 80 },
          { id: 'q1', label: 'Is the act effective the moment the agent receives it?', kind: 'question', x: 270, y: 220 },
          { id: 't1', label: 'Nobody loses. The absent person only stands to gain.', kind: 'tension', x: 270, y: 340 },
          { id: 'fm1', label: 'Same formula: one may effect a benefit for a person in his absence', kind: 'formula', x: 80, y: 460 },
          { id: 'o1', label: 'Outcome here: it WORKS — a pure benefit takes effect without consent', kind: 'outcome', x: 480, y: 460 },
        ],
        edges: [
          { from: 'f1', to: 'q1', label: 'setup' },
          { from: 'f2', to: 'q1', label: 'setup' },
          { from: 'q1', to: 't1', label: 'weighs' },
          { from: 't1', to: 'fm1', label: 'invokes' },
          { from: 'fm1', to: 'o1', label: 'succeeds here' },
        ],
      },
      slides: [
        { title: 'The setup', body: 'A document is being delivered that purely benefits an absent person.', emphasis: null },
        { title: 'The act', body: 'Someone accepts it on his behalf. The beneficiary knows nothing about it yet.', emphasis: null },
        { title: 'The question', body: 'Does receipt by the third party already take effect for the absent person?', emphasis: null },
        { title: 'The same principle', body: 'The exact formula from Case A: one may effect a benefit for a person in his absence.', emphasis: 'The IDENTICAL formula — 90 daf away' },
        { title: 'The outcome', body: 'Here nobody is harmed, so the formula holds: the act takes effect immediately.', emphasis: 'Same formula, opposite outcome' },
      ],
      script: null,
      verified: true,
    },
    update: {},
  });

  const pair = await prisma.formulaPair.upsert({
    where: { id: 'seed-pair-zakhin' },
    create: {
      id: 'seed-pair-zakhin',
      caseAId: occA.id,
      caseBId: occB.id,
      formulaAId: formula.id,
      formulaBId: formula.id,
      distanceDaf: 90,
      outcomeContrast: true,
      contrastNotes:
        'Confirmed seed pair (product brief): the formula fails in the BM 10a context (benefit to one harms others) and succeeds in Gittin 11b (pure benefit). Same formula, opposite outcome — the contrast IS the lesson.',
      confidence: 1,
      verified: true,
      newWordBudget: 25,
      explainerAId: explainerA.id,
      explainerBId: explainerB.id,
    },
    update: {},
  });

  // Acceptance DB: Davidson English as the verified acceptable translation.
  for (const [occ, seg] of [
    [occA, caseASeg],
    [occB, caseBSeg],
  ] as const) {
    if (seg.en) {
      const exists = await prisma.acceptableTranslation.findFirst({
        where: { occurrenceRef: occ.ref, text: seg.en },
      });
      if (!exists) {
        await prisma.acceptableTranslation.create({
          data: { occurrenceRef: occ.ref, text: seg.en, verified: true },
        });
      }
    }
  }

  // Near-miss (2.6): the same Mishnah pairs the formula with its inverse —
  // "one may NOT act to a person's detriment EXCEPT in his presence."
  // Locate the inverse verbatim in the fetched text; skip if absent.
  const inversePlain = 'אין חבין לאדם אלא בפניו';
  const inverseSeg =
    findSegment([...gitSegments, ...bmSegments], [inversePlain, 'חבין לאדם']) ?? null;
  const inverseVowel = inverseSeg
    ? extractVowelSpan(inverseSeg.vowel, inversePlain) ??
      extractVowelSpan(inverseSeg.vowel, 'חבין לאדם')
    : null;
  if (inverseVowel) {
    const variant = await prisma.formula.upsert({
      where: { id: 'seed-formula-chavin' },
      create: {
        id: 'seed-formula-chavin',
        skeleton: 'אין חבין ל{X} אלא בפניו',
        display: inverseVowel,
        category: 'ACQUISITION',
        gloss: 'one may NOT act to a person’s detriment except in his presence',
        verified: true,
      },
      update: {},
    });
    await prisma.nearMissExercise.upsert({
      where: { id: 'seed-nearmiss-1' },
      create: {
        id: 'seed-nearmiss-1',
        pairId: pair.id,
        baseFormulaId: formula.id,
        variantFormulaId: variant.id,
        changedWord: 'אלא',
        question:
          'The twin formula swaps "shelo b’fanav" (NOT in his presence) for "ela b’fanav" (ONLY in his presence). What practical difference does that one word make?',
        options: [
          { id: 'a', text: 'A benefit can take effect behind someone’s back; a detriment requires him to be there (or consent).', correct: true },
          { id: 'b', text: 'No practical difference — the two phrasings mean the same thing.', correct: false },
          { id: 'c', text: 'It changes who may act: only relatives may act in his absence.', correct: false },
          { id: 'd', text: 'It limits the rule to monetary cases and excludes documents.', correct: false },
        ],
        explanation:
          'The function word flips the scope: "shelo b’fanav" extends the act to an absent beneficiary (pure gain needs no consent), while "ela b’fanav" restricts a harmful act to the person’s presence — consent is the issue, and the one changed word carries the whole legal difference.',
        verified: true,
      },
      update: {},
    });
    console.log('  near-miss exercise seeded');
  } else {
    console.log('  TODO: inverse formula not found in fetched window — near-miss skipped');
  }

  await seedTaggedSugya(caseASeg, bmSegments, pair.id);
  await seedClasses(caseASeg.ref, caseBSeg.ref, pair.id);
}

/** Starter P4 corpus: the seed daf's argument graph (confirmed seed content). */
async function seedTaggedSugya(
  anchor: Segment,
  segments: Segment[],
  _pairId: string,
): Promise<void> {
  console.log('Seeding starter tagged sugya…');
  const moveTypes = new Map(
    (await prisma.sugyaMoveType.findMany()).map((m) => [m.name, m]),
  );
  const anchorIdx = segments.findIndex((s) => s.ref === anchor.ref);
  const window = segments.slice(Math.max(0, anchorIdx - 1), anchorIdx + 3);
  if (window.length < 2) {
    console.log('  TODO: not enough segments around the anchor — skipped');
    return;
  }

  const sugya = await prisma.taggedSugya.upsert({
    where: { ref: 'Bava Metzia 10a' },
    create: {
      ref: 'Bava Metzia 10a',
      tractate: 'Bava Metzia',
      title: 'Seizing for a creditor where others lose out',
      verified: true,
    },
    update: {},
  });
  await prisma.argumentEdge.deleteMany({ where: { sugyaId: sugya.id } });
  await prisma.mCQuestion.deleteMany({ where: { sugyaId: sugya.id } });
  await prisma.argumentNode.deleteMany({ where: { sugyaId: sugya.id } });

  const glosses = [
    { type: 'Memra', gloss: 'A ruling is stated: seizing property on behalf of a creditor, where it disadvantages other creditors, does not acquire.' },
    { type: 'Kushya', gloss: 'Objection: but one may effect a benefit for a person in his absence — so the seizure should work for the creditor!' },
    { type: 'Terutz', gloss: 'Resolution: acting for one party is no longer a pure benefit when it directly harms the others; the benefit rule does not extend that far.' },
    { type: 'Maskana', gloss: 'Conclusion: where seizing for one claimant injures the rest, the seizure fails.' },
  ];
  const nodes = [];
  for (let i = 0; i < glosses.length; i++) {
    const mt = moveTypes.get(glosses[i].type)!;
    nodes.push(
      await prisma.argumentNode.create({
        data: {
          sugyaId: sugya.id,
          moveTypeId: mt.id,
          spanRef: window[Math.min(i, window.length - 1)].ref,
          englishGloss: glosses[i].gloss,
          order: i,
        },
      }),
    );
  }
  await prisma.argumentEdge.createMany({
    data: [
      { sugyaId: sugya.id, fromId: nodes[1].id, toId: nodes[0].id, relation: 'OBJECTS_TO' },
      { sugyaId: sugya.id, fromId: nodes[2].id, toId: nodes[1].id, relation: 'RESOLVES' },
      { sugyaId: sugya.id, fromId: nodes[3].id, toId: nodes[2].id, relation: 'CONCLUDES' },
    ],
  });

  await prisma.mCQuestion.create({
    data: {
      sugyaId: sugya.id,
      spanRef: anchor.ref,
      prompt: 'What happened in this exchange?',
      options: [
        { id: 'a', text: 'A ruling was stated, challenged from the benefit-in-absence principle, and defended by distinguishing pure benefit from benefit that harms others.', correct: true },
        { id: 'b', text: 'An open inquiry was posed and left unresolved (teiku).', correct: false },
        { id: 'c', text: 'A proof from a Mishnah conclusively refuted the ruling (teyuvta).', correct: false },
        { id: 'd', text: 'Two independent rulings were stated with no interaction between them.', correct: false },
      ],
      verified: true,
    },
  });
  console.log('  tagged sugya + MC question seeded');
}

/** 4.4 question-type classes (hand-authored teaching surface, English). */
async function seedClasses(refA: string, refB: string, pairId: string): Promise<void> {
  console.log('Seeding question-type classes…');
  const moveTypes = new Map(
    (await prisma.sugyaMoveType.findMany()).map((m) => [m.name, m]),
  );
  const classes = [
    {
      id: 'seed-class-kushya',
      moveType: 'Kushya',
      title: 'The objection that must be answered (kushya)',
      soWhat: 'When you spot a kushya, the next move is forced: either a terutz arrives, or the position under attack falls. Read on expecting an answer.',
      nearMissPairId: pairId,
      body: [
        { heading: 'What it is', text: 'A kushya is a difficulty hurled at a position — from a source or from logic. It is not a request for information; it is a claim that something is broken.', exampleRefs: [refA] },
        { heading: 'How to spot it', text: 'Watch for the attacking particles — "but behold…" (ve-ha), "it is difficult" (kashya) — aimed at a statement someone just made.', exampleRefs: [refA] },
        { heading: 'The so-what', text: 'A kushya DEMANDS resolution. If the Gemara moves on without one, something important happened — the position may have been abandoned.', exampleRefs: [] },
      ],
    },
    {
      id: 'seed-class-ibaaya',
      moveType: 'Ibaaya',
      title: 'The open inquiry that may stand (ibaaya)',
      soWhat: 'Unlike a kushya, an ibaaya is allowed to end in "teiku" — let it stand. Expect attempted proofs, not a guaranteed answer.',
      nearMissPairId: pairId,
      body: [
        { heading: 'What it is', text: 'An ibaaya ("it was asked of them") is a genuine open question posed to the study hall: what IS the law in this case? Nobody is under attack.', exampleRefs: [refB] },
        { heading: 'Kushya vs ibaaya', text: 'Same question mark, opposite stakes. A kushya says "your position seems wrong — defend it." An ibaaya says "we don’t know yet — can anyone prove it either way?"', exampleRefs: [] },
        { heading: 'The so-what', text: 'When you see the ibaaya formula, relax your expectation of resolution: a chain of attempted proofs may each be deflected, and "teiku" is a legitimate ending.', exampleRefs: [] },
      ],
    },
    {
      id: 'seed-class-source',
      moveType: 'SourceQuestion',
      title: 'Where is this from? (the source question)',
      soWhat: 'Expect a derivation next — a verse, a baraita, or an inference chain. The law itself is not in doubt; its pedigree is.',
      nearMissPairId: null,
      body: [
        { heading: 'What it is', text: 'The Gemara often accepts a law but asks for its source: "from where are these matters?" The question challenges provenance, not correctness.', exampleRefs: [refA] },
        { heading: 'The so-what', text: 'A source question is followed by a derivation, and the derivation itself can then be attacked — watch whether the next kushya targets the law or only its proof.', exampleRefs: [] },
      ],
    },
    {
      id: 'seed-class-logical',
      moveType: 'LogicalChallenge',
      title: 'Why is this case different? (mai shna)',
      soWhat: 'Expect a distinction (chiluk) between the two compared cases — or a retraction of one of the rulings.',
      nearMissPairId: pairId,
      body: [
        { heading: 'What it is', text: 'A consistency challenge: two cases look alike but the law differs. "What is different about this one?" The argument runs on the comparison.', exampleRefs: [refA, refB] },
        { heading: 'The seed pair is exactly this', text: 'The same formula governs both of our cases, yet the outcomes are opposite. The Gemara’s answer is a distinction: pure benefit versus benefit that harms a third party.', exampleRefs: [refA, refB] },
        { heading: 'The so-what', text: 'When you can predict the distinction before the Gemara states it, you are reading the OUTSIDE on your own.', exampleRefs: [] },
      ],
    },
  ];
  let order = 0;
  for (const c of classes) {
    const mt = moveTypes.get(c.moveType);
    if (!mt) continue;
    await prisma.classLesson.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        moveTypeId: mt.id,
        title: c.title,
        body: c.body,
        soWhat: c.soWhat,
        nearMissPairId: c.nearMissPairId,
        verified: true,
        order: order++,
      },
      update: { body: c.body, soWhat: c.soWhat },
    });
  }
  console.log(`  ${classes.length} classes`);
}

async function main(): Promise<void> {
  await seedLexicon();
  await seedMoveTypes();
  try {
    await seedPair();
  } catch (err) {
    console.error('\nSeed pair skipped — Sefaria fetch failed:');
    console.error(`  ${err instanceof Error ? err.message : err}`);
    console.error('  Re-run `npm run seed` from an environment with access to sefaria.org.');
    process.exitCode = 2;
  }
  await prisma.$disconnect();
  console.log('Done.');
}

main();
