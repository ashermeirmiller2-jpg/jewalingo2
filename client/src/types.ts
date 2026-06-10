// Types for the Jewoulingo API contract (docs/API.md).
// Where the contract leaves payload internals unspecified (exercise shapes,
// explainer slide/script internals, admin evidence), fields are typed
// permissively and normalized at the component boundary.

// ---------- Words & Aramaic text ----------

export interface ApiWord {
  id?: string;
  vowel: string;
  plain: string;
  gloss: string;
  isFunction: boolean;
  functionColor?: string | null;
  isNew?: boolean;
}

export interface Occurrence {
  id?: string;
  ref: string;
  tractate?: string;
  daf?: string;
  textVowel: string;
  textPlain?: string;
  sugyaRef?: string;
  caseCategory?: string;
}

// ---------- Session & progress ----------

export interface Progress {
  knownWordCount: number;
  words: { plain: string; gloss: string; isFunction: boolean; strength: number }[];
  outsideMastery: number;
  streakDays: number;
}

// ---------- Pairs ----------

export interface FormulaSummary {
  skeleton: string;
  gloss: string;
  category: string;
}

export interface CaseSummary {
  ref: string;
  tractate: string;
}

export interface PairSummary {
  id: string;
  formulaA: FormulaSummary;
  caseA: CaseSummary;
  caseB: CaseSummary;
  distanceDaf: number;
  outcomeContrast: boolean;
}

// ---------- Explainers ----------

export interface MindmapNode {
  id: string;
  label: string;
  x: number;
  y: number;
  detail?: string;
}

export interface MindmapEdge {
  fromId?: string;
  toId?: string;
  from?: string;
  to?: string;
  source?: string;
  target?: string;
  label?: string;
}

export type SlideLike = string | { title?: string; body?: string; text?: string };

export type ScriptLike =
  | string
  | string[]
  | { text: string; slideIndex?: number; durationMs?: number }[];

export interface Explainer {
  id?: string;
  title: string;
  mindmap?: { nodes: MindmapNode[]; edges: MindmapEdge[] } | null;
  slides?: SlideLike[] | null;
  script?: ScriptLike | null;
}

// ---------- Flow steps ----------

export interface TapMatchExercise {
  type: "tapMatch";
  id?: string;
  pairs?: { aramaic: string; gloss: string }[];
  words?: ApiWord[];
}

export interface ReorderExercise {
  type: "reorder";
  id?: string;
  tiles?: string[];
  correctOrder?: string[];
  answer?: string[];
  words?: string[];
}

export interface FillFunctionExercise {
  type: "fillFunction";
  id?: string;
  sentence?: string;
  textVowel?: string;
  blankIndex?: number;
  blankWord?: string;
  options?: (string | { id?: string; text: string })[];
  answer?: string;
  correctOptionId?: string;
  correctIndex?: number;
}

export type Exercise = TapMatchExercise | ReorderExercise | FillFunctionExercise;

export interface LeinHints {
  functionBars?: (string | null)[] | ApiWord[];
  glosses?: (string | { vowel?: string; plain?: string; gloss: string })[];
  formulaReminder?: string;
  fullTranslation?: string;
}

export interface ExplainerStep {
  kind: "explainerA" | "explainerB";
  explainer: Explainer;
}

export interface InsideAStep {
  kind: "insideA";
  occurrence: Occurrence;
  words: ApiWord[];
  skeleton: string;
  exercises: Exercise[];
}

export interface LeinBStep {
  kind: "leinB";
  occurrence: Occurrence;
  words?: ApiWord[];
  tiles: string[];
  hints: LeinHints;
}

export interface NearMiss {
  id: string;
  baseDisplay: string;
  variantDisplay: string;
  changedWord: string;
  question: string;
  options: { id: string; text: string }[];
}

export interface ContrastStep {
  kind: "contrast";
  sameSkeleton?: {
    wordsA: ApiWord[];
    wordsB: ApiWord[];
    functionMatches: [number, number][];
  };
  nearMisses?: NearMiss[];
}

export type FlowStep = ExplainerStep | InsideAStep | LeinBStep | ContrastStep;

export interface PairFlow {
  steps: FlowStep[];
}

export interface LeinGradeResult {
  verdict: "correct" | "partial" | "incorrect";
  correctSpans: [number, number][];
  wrongSpans: [number, number][];
  pshatNote: string;
}

export interface ContrastAnswerResult {
  correct: boolean;
  explanation: string;
}

// ---------- The OUTSIDE ----------

export interface SugyaSummary {
  id: string;
  ref: string;
  tractate: string;
  title: string;
}

export interface MoveType {
  name: string;
  color?: string;
  soWhat?: string;
  isQuestionType?: boolean;
}

export interface SugyaNode {
  id: string;
  moveType: MoveType;
  englishGloss: string;
  spanRef?: string;
  order: number;
}

export interface SugyaEdge {
  fromId: string;
  toId: string;
  relation: string;
}

export interface SugyaGraph {
  nodes: SugyaNode[];
  edges: SugyaEdge[];
}

export interface InsideText {
  vowel: string;
  plain: string;
}

export interface SugyaLink {
  id?: string;
  toSugya: { id: string; ref: string; title: string };
  pattern: string;
}

export interface ClassSummary {
  id: string;
  title: string;
  moveType: MoveType;
}

export interface ClassDetail {
  title: string;
  body: string | { heading?: string; text: string }[];
  soWhat: string;
  moveType: MoveType;
  examples: { ref: string; vowel: string; plain: string }[];
  nearMissPairId?: string | null;
}

export interface McQuestion {
  id: string;
  prompt: string;
  spanText?: { vowel: string } | null;
  options: { id: string; text: string }[];
  done?: false;
}

export type McNext = McQuestion | { done: true };

export interface McAnswerResult {
  correct: boolean;
  correctOptionId: string;
}

// ---------- Visual builder ----------

export interface VisualNode {
  id: string;
  englishGloss: string;
  moveTypeName: string;
}

export interface VennSpec {
  leftLabel?: string;
  rightLabel?: string;
  left?: { label?: string; moveTypes?: string[] };
  right?: { label?: string; moveTypes?: string[] };
  leftMoveTypes?: string[];
  rightMoveTypes?: string[];
}

export interface VisualPayload {
  nodes: VisualNode[];
  moveTypes: (string | MoveType)[];
  relations: string[];
  venn?: VennSpec | null;
}

export interface VisualEdge {
  fromId: string;
  toId: string;
  relation: string;
}

export interface VisualCheckResult {
  score: number;
  missing: VisualEdge[];
  wrong: VisualEdge[];
}

// ---------- Review ----------

export type ReviewKind = "FORMULA" | "LEIN" | "MC" | "CLASS" | "CONTRAST";

export interface ReviewItem {
  id: string;
  kind: ReviewKind;
  targetId: string;
  due: string;
  payload?: Record<string, unknown> | null;
}

export interface ReviewGradeResult {
  due: string;
  state: string;
}

// ---------- Admin ----------

export interface AdminPairCandidate {
  id: string;
  formulaA?: FormulaSummary;
  formula?: FormulaSummary;
  skeleton?: string;
  caseA?: CaseSummary;
  caseB?: CaseSummary;
  caseARef?: string;
  caseBRef?: string;
  distanceDaf?: number;
  outcomeContrast?: boolean;
  confidence?: number;
  contrastNotes?: string;
  occurrences?: Occurrence[];
  evidence?: { occurrences?: Occurrence[]; skeleton?: string; contrastNotes?: string };
  verified?: boolean;
}

export interface AdminSugya {
  id: string;
  ref: string;
  tractate?: string;
  title: string;
  verified?: boolean;
}

export interface AdminMcQuestion {
  id: string;
  prompt: string;
  options?: { id: string; text: string }[];
  verified?: boolean;
}

// ---------- Errors ----------

export interface CoveragePayload {
  error: "coverage";
  coverage: number;
  required: number;
  missingWords?: string[];
}
