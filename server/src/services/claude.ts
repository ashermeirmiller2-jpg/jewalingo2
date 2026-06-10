/**
 * Claude API grading + generation service.
 *
 * Wraps all model calls used by both products:
 *  - free-translation grading (P2 lein challenge)
 *  - sugya move classification (P4 parser)
 *  - "what happened" MC generation (P4)
 *  - explainer generation: mind map, slides, optional video script (P2)
 *  - near-miss contrast exercise generation (P2)
 *
 * Always returns structured JSON. Callers ALWAYS persist results with
 * verified=false — nothing a model produces reaches a learner until a human
 * flips the flag in the admin UI (hard rule 2).
 *
 * HARD RULE 1: prompts may pass verbatim Sefaria text IN, but no model output
 * containing Aramaic is ever rendered — generated content is English-only
 * structure; on-screen Aramaic is always composited from CachedRef.
 */
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

const MODEL = 'claude-opus-4-8';

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

async function structured<T extends z.ZodTypeAny>(
  system: string,
  user: string,
  schema: T,
): Promise<z.infer<T>> {
  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system,
    messages: [{ role: 'user', content: user }],
    output_config: { format: zodOutputFormat(schema) },
  });
  if (response.parsed_output == null) {
    throw new Error('Claude returned unparseable output');
  }
  return response.parsed_output;
}

// ───────────────────────── Free-translation grading ─────────────────────────

const GradeSchema = z.object({
  verdict: z.enum(['correct', 'partial', 'incorrect']),
  correctSpans: z.array(z.tuple([z.number(), z.number()])).describe(
    'character spans of the learner answer that are correct',
  ),
  wrongSpans: z.array(z.tuple([z.number(), z.number()])),
  pshatNote: z.string().describe('one-line pshat (plainest-meaning) note'),
});
export type GradeResult = z.infer<typeof GradeSchema>;

export async function gradeFreeTranslation(args: {
  aramaicVowel: string; // verbatim Sefaria text being leined
  learnerAnswer: string;
  acceptableTranslations: string[]; // verified acceptance DB entries
  formulaGloss?: string;
}): Promise<GradeResult> {
  const system = `You grade a beginner's English translation of a Talmudic Aramaic passage.
Judge meaning, not phrasing: any rendering that captures the pshat (plainest literal sense) is correct.
"partial" means the core formula/structure is right but a span is wrong or missing.
Spans index into the learner's answer string. Be encouraging but precise in the pshat note (one line).`;
  const user = JSON.stringify({
    passage: args.aramaicVowel,
    formulaGloss: args.formulaGloss ?? null,
    acceptableTranslations: args.acceptableTranslations,
    learnerAnswer: args.learnerAnswer,
  });
  return structured(system, user, GradeSchema);
}

// ───────────────────────── Sugya move classification ────────────────────────

const MoveTagSchema = z.object({
  nodes: z.array(
    z.object({
      spanIndex: z.number().describe('index of the input span'),
      moveType: z.string().describe('one of the provided move type names'),
      englishGloss: z.string().describe('the OUTSIDE: this move rendered in plain English'),
    }),
  ),
  edges: z.array(
    z.object({
      fromIndex: z.number(),
      toIndex: z.number(),
      relation: z.enum([
        'OBJECTS_TO',
        'RESOLVES',
        'PROVES',
        'REFUTES',
        'CONCLUDES',
        'DEPENDS_ON',
        'RESPONDS_TO',
      ]),
    }),
  ),
});
export type MoveTagResult = z.infer<typeof MoveTagSchema>;

export async function classifySugyaMoves(args: {
  spans: Array<{ ref: string; vowel: string; en?: string }>;
  moveTypes: Array<{ name: string; particle: string | null; description: string }>;
}): Promise<MoveTagResult> {
  const system = `You analyze the argument structure of a Talmudic sugya.
Tag each span with exactly one move type from the provided taxonomy (use particle cues where given),
write a one-sentence English gloss of the move (the OUTSIDE — the logic, not a translation),
and emit directed edges describing the logical relations between moves.
Your output is a CANDIDATE for human verification; be conservative and prefer the most standard reading.`;
  const user = JSON.stringify(args);
  return structured(system, user, MoveTagSchema);
}

// ───────────────────────── MC question generation ────────────────────────────

const McSchema = z.object({
  questions: z.array(
    z.object({
      spanIndex: z.number().nullable(),
      prompt: z.string(),
      options: z.array(
        z.object({ id: z.string(), text: z.string(), correct: z.boolean() }),
      ),
    }),
  ),
});
export type McGenResult = z.infer<typeof McSchema>;

export async function generateMcQuestions(args: {
  sugyaTitle: string;
  nodes: Array<{ index: number; moveType: string; englishGloss: string }>;
  edges: Array<{ fromIndex: number; toIndex: number; relation: string }>;
}): Promise<McGenResult> {
  const system = `You write "What happened here?" multiple-choice questions about the argument
structure of a Talmudic sugya, from its verified move graph. 4 options each, exactly one correct.
Distractors must be PLAUSIBLE WRONG READINGS of the move structure (e.g. mistaking a kushya for an
open inquiry, reversing who objects to whom) — not absurd answers. English only.`;
  const user = JSON.stringify(args);
  return structured(system, user, McSchema);
}

// ───────────────────────── Explainer generation ──────────────────────────────

const ExplainerSchema = z.object({
  title: z.string(),
  mindmap: z.object({
    nodes: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        kind: z.enum(['fact', 'question', 'tension', 'formula', 'outcome']),
        x: z.number(),
        y: z.number(),
      }),
    ),
    edges: z.array(z.object({ from: z.string(), to: z.string(), label: z.string() })),
  }),
  slides: z
    .array(z.object({ title: z.string(), body: z.string(), emphasis: z.string().nullable() }))
    .describe('4-7 slides: case setup -> tension -> formula -> outcome'),
  script: z.string().nullable().describe('optional video narration over the slides'),
});
export type ExplainerGenResult = z.infer<typeof ExplainerSchema>;

export async function generateExplainer(args: {
  ref: string;
  caseEnglish: string; // Davidson English for grounding — admin-facing source
  formulaGloss: string;
  includeScript: boolean;
}): Promise<ExplainerGenResult> {
  const system = `You create a NotebookLM-style OUTSIDE explainer for one Talmudic case: the
argument/logic structure rendered in plain English for a beginner. ENGLISH ONLY — never include
Hebrew or Aramaic characters anywhere in your output; refer to the formula by its English gloss.
Mind map: 5-9 nodes (facts, the question, the tension, the formula's role, the outcome) with
x,y layout coordinates in a 0-1000 x 0-600 canvas. Slides: 4-7, each 1-3 short sentences.
${'' /* script generated only behind the video feature flag */}`;
  const user = JSON.stringify({
    ref: args.ref,
    caseEnglish: args.caseEnglish,
    formulaGloss: args.formulaGloss,
    wantScript: args.includeScript,
  });
  const result = await structured(system, user, ExplainerSchema);
  // Hard rule 1 backstop: refuse any generated Hebrew/Aramaic characters.
  const serialized = JSON.stringify(result);
  if (/[֐-׿]/.test(serialized)) {
    throw new Error('Generated explainer contained Hebrew characters — rejected (hard rule 1)');
  }
  return result;
}

// ───────────────────────── Near-miss exercise generation ─────────────────────

const NearMissSchema = z.object({
  exercises: z.array(
    z.object({
      changedWordGloss: z.string().describe('English gloss of the function word that differs'),
      question: z.string(),
      options: z.array(z.object({ id: z.string(), text: z.string(), correct: z.boolean() })),
      explanation: z.string(),
    }),
  ),
});
export type NearMissGenResult = z.infer<typeof NearMissSchema>;

export async function generateNearMissExercises(args: {
  baseSkeletonGloss: string;
  variantSkeletonGloss: string;
  changedWord: string; // plain Aramaic of the changed function word (input only)
  changedWordGloss: string;
}): Promise<NearMissGenResult> {
  const system = `You write near-miss contrast exercises for Talmudic Aramaic formulas: the learner
has mastered one formula and sees a variant where ONE function word changed. The exercise asks what
PRACTICAL difference that change makes to the argument (e.g. a difficulty that demands resolution vs
an open inquiry that may stand unresolved). 4 options, one correct, with a short explanation.
English only in your output.`;
  const user = JSON.stringify(args);
  return structured(system, user, NearMissSchema);
}
