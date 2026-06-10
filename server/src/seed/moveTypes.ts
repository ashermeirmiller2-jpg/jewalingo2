/**
 * P4 sugya-move taxonomy (4.1) — the controlled vocabulary of Talmudic moves.
 * Curated from the standard analytic tradition; extended as tagging surfaces
 * more. Question forms capture the triggering particle/formula (linking to
 * P2's formulas) and whether they demand resolution.
 */

export interface MoveTypeSeed {
  name: string;
  hebrewName: string;
  particle: string | null; // plain (nikud-stripped) triggering particle/formula
  description: string;
  soWhat: string; // what the learner should expect next in the sugya
  color: string;
  isQuestionType: boolean;
  demandsResolution: boolean | null;
}

export const MOVE_TYPES: MoveTypeSeed[] = [
  {
    name: 'Memra',
    hebrewName: 'מימרא',
    particle: 'אמר',
    description: 'A stated ruling or teaching attributed to an Amora.',
    soWhat: 'Expect the Gemara to test it: support it with a source, or raise a difficulty against it.',
    color: '#0d9488',
    isQuestionType: false,
    demandsResolution: null,
  },
  {
    name: 'Kushya',
    hebrewName: 'קושיא',
    particle: 'והא',
    description: 'A difficulty or objection raised against a position from logic or a source.',
    soWhat: 'A kushya DEMANDS a resolution — expect a terutz next, or the position falls.',
    color: '#dc2626',
    isQuestionType: true,
    demandsResolution: true,
  },
  {
    name: 'Terutz',
    hebrewName: 'תירוץ',
    particle: 'אלא',
    description: 'A resolution of a kushya: reinterpreting the source, distinguishing the cases, or amending the position.',
    soWhat: 'Check whether the resolution stands — the Gemara may attack the terutz itself.',
    color: '#16a34a',
    isQuestionType: false,
    demandsResolution: null,
  },
  {
    name: 'Maskana',
    hebrewName: 'מסקנא',
    particle: 'והלכתא',
    description: 'The concluding position of the sugya.',
    soWhat: 'The discussion is settled; later sugyot may cite this conclusion as a given.',
    color: '#c9a227',
    isQuestionType: false,
    demandsResolution: null,
  },
  {
    name: 'ShaklaVtarya',
    hebrewName: 'שקלא וטריא',
    particle: null,
    description: 'The give-and-take: the connective back-and-forth tissue between the named moves.',
    soWhat: 'Track who is speaking and which position each exchange strengthens or weakens.',
    color: '#64748b',
    isQuestionType: false,
    demandsResolution: null,
  },
  {
    name: 'Raya',
    hebrewName: 'ראיה',
    particle: 'תא שמע',
    description: 'A proof brought in support of a position, typically from a Mishnah or baraita.',
    soWhat: 'Expect the Gemara to test whether the proof is conclusive or can be deflected.',
    color: '#0369a1',
    isQuestionType: false,
    demandsResolution: null,
  },
  {
    name: 'Teyuvta',
    hebrewName: 'תיובתא',
    particle: 'תיובתא',
    description: 'A conclusive refutation from a tannaitic source; the refuted position is dismissed.',
    soWhat: 'The refuted Amora’s position is out — unless the sugya later rehabilitates it.',
    color: '#7f1d1d',
    isQuestionType: false,
    demandsResolution: null,
  },
  // ── question-form sub-taxonomy (4.1: distinguish the kinds of questions) ──
  {
    name: 'Ibaaya',
    hebrewName: 'איבעיא להו',
    particle: 'איבעיא להו',
    description: 'An open inquiry posed to the study hall — a genuine "what is the law?" question.',
    soWhat: 'Unlike a kushya, an ibaaya MAY stand unresolved (teiku). Expect attempted proofs, not necessarily an answer.',
    color: '#9333ea',
    isQuestionType: true,
    demandsResolution: false,
  },
  {
    name: 'SourceQuestion',
    hebrewName: 'מנא הני מילי',
    particle: 'מנלן',
    description: 'A request for the scriptural or tannaitic source of a stated law.',
    soWhat: 'Expect a derivation: a verse, a baraita, or a chain of inference.',
    color: '#b45309',
    isQuestionType: true,
    demandsResolution: true,
  },
  {
    name: 'LogicalChallenge',
    hebrewName: 'מאי שנא',
    particle: 'מאי שנא',
    description: 'A consistency challenge: why does the law differ here from a comparable case?',
    soWhat: 'Expect a distinction (chiluk) between the two cases, or a retraction of one ruling.',
    color: '#be185d',
    isQuestionType: true,
    demandsResolution: true,
  },
  {
    name: 'ClarificationQuestion',
    hebrewName: 'מאי קאמר',
    particle: 'מאי',
    description: 'A request to clarify what a statement means before it can be evaluated.',
    soWhat: 'Expect a restatement or definition — the argument pauses until the terms are clear.',
    color: '#2563eb',
    isQuestionType: true,
    demandsResolution: true,
  },
];
