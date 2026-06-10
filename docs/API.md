# Jewoulingo API Contract

Base URL: `http://localhost:4000/api`. All responses are JSON. Errors: `{ error: string, details?: any }`.

Identity: no signup required. `POST /session/anon` returns `{ userId }`; the client stores it
and sends it as the `x-user-id` header on every subsequent request. Clerk-authenticated users
send their Clerk JWT instead (server resolves/links a User row); anonymous flow is first-class
so start-to-learning stays under 90 seconds.

**Verified gate:** every route below only ever returns rows with `verified=true` unless the
route lives under `/admin`. **Coverage gate:** any route serving Aramaic case text checks the
user's known-word coverage server-side and returns `403 { error: "coverage", coverage, required: 0.7, missingWords }` when under 70%.

## Session & progress
- `POST /session/anon` → `{ userId }`
- `GET /progress` → `{ knownWordCount, words: [{plain, gloss, isFunction, strength}], outsideMastery, streakDays }`
- `POST /words/learn` body `{ wordIds: string[] }` → marks words learned (used after intro screens)

## P2 — pairs & learner flow
- `GET /pairs?category=&top=` → `[{ id, formulaA: {skeleton, gloss, category}, caseA: {ref, tractate}, caseB: {ref, tractate}, distanceDaf, outcomeContrast }]` (verified only)
- `GET /pairs/:id` → full pair: occurrences (with `textVowel`, `textPlain`), formula, explainer ids
- `GET /pairs/:id/flow` → the 5-step flow payload (coverage-gated):
  ```json
  { "steps": [
    { "kind": "explainerA", "explainer": { "title", "mindmap", "slides", "script" } },
    { "kind": "insideA", "occurrence": {...}, "words": [{ "vowel", "plain", "gloss", "isFunction", "functionColor", "isNew" }], "skeleton": "...", "exercises": [ {"type":"tapMatch"|"reorder"|"fillFunction", ...} ] },
    { "kind": "explainerB", "explainer": {...} },
    { "kind": "leinB", "occurrence": {...}, "tiles": ["shuffled","english","tiles"], "hints": { "functionBars": [...], "glosses": [...], "formulaReminder": "...", "fullTranslation": "..." } },
    { "kind": "contrast", "sameSkeleton": { "wordsA": [...], "wordsB": [...], "functionMatches": [[i,j]...] }, "nearMisses": [{ "id", "baseDisplay", "variantDisplay", "changedWord", "question", "options": [{"id","text"}] }] }
  ] }
  ```
- `POST /lein/grade` body `{ pairId, mode: "tiles"|"free", answer: string, hintsUsed: number }` →
  `{ verdict: "correct"|"partial"|"incorrect", correctSpans: [[start,end]], wrongSpans: [[start,end]], pshatNote: string }`. Feeds FSRS (kind=LEIN).
- `POST /contrast/answer` body `{ exerciseId, optionId }` → `{ correct: boolean, explanation }`. Feeds FSRS (kind=CONTRAST).

## P4 — the OUTSIDE
- `GET /sugyot` → `[{ id, ref, tractate, title }]` (verified only)
- `GET /sugyot/:id/graph` → `{ nodes: [{ id, moveType: {name, color, soWhat}, englishGloss, spanRef, order }], edges: [{ fromId, toId, relation }] }`
- `GET /sugyot/:id/inside/:nodeId` → `{ vowel, plain }` (verbatim CachedRef text; coverage-gated)
- `GET /sugyot/:id/links` → verified SugyaLinks `[{ toSugya: {id, ref, title}, pattern }]`
- `GET /classes` → `[{ id, title, moveType: {name, isQuestionType} }]`
- `GET /classes/:id` → `{ title, body, soWhat, moveType, examples: [{ref, vowel, plain}], nearMissPairId }`
- `GET /mc/next` → SRS-scheduled next question `{ id, prompt, spanText?: {vowel}, options: [{id, text}] }` or `{ done: true }`
- `POST /mc/answer` body `{ questionId, optionId }` → `{ correct, correctOptionId }`. Feeds FSRS (kind=MC) + outsideMastery.
- `GET /visual/:sugyaId` → `{ nodes: [{id, englishGloss, moveTypeName}], moveTypes: [...], relations: [...] }` (shuffled, edges withheld)
- `POST /visual/check` body `{ sugyaId, edges: [{fromId, toId, relation}] }` → `{ score: 0..1, missing: [...], wrong: [...] }`

## Unified review (FSRS)
- `GET /review/queue` → `[{ id, kind, targetId, due, payload }]` due items across both products
- `POST /review/grade` body `{ itemId, rating: 1|2|3|4 }` (Again/Hard/Good/Easy) → `{ due, state }`

## Admin (human-in-the-loop; gated by `x-admin-key` header = env ADMIN_KEY)
- `GET /admin/pairs?verified=false` → candidates with confidence + evidence (occurrences, skeleton, contrastNotes)
- `POST /admin/pairs/:id/verify` body `{ verified: boolean }`
- `POST /admin/import/candidates` body = discovery-pipeline output (see docs/PIPELINE.md JSON schema) → upserts Formula/Occurrence/Pair rows with `verified=false`
- `GET /admin/sugyot?verified=false`; `POST /admin/sugyot/:id/verify` body `{ verified }`
- `POST /admin/sugyot/tag` body `{ ref, title, tractate }` → runs segmentation + Claude move-classification, stores TaggedSugya graph `verified=false`
- `POST /admin/mc/generate` body `{ sugyaId }` → Claude-generates MC questions `verified=false`
- `POST /admin/mc/:id/verify` body `{ verified }`
- `POST /admin/explainers/generate` body `{ pairId }` → Claude-generates both explainers `verified=false`
- `POST /admin/explainers/:id/verify` body `{ verified }`
- `POST /admin/links/:id/verify` body `{ verified }`

## Discovery pipeline import JSON (`POST /admin/import/candidates`)
```json
{
  "formulas": [{ "key": "skeleton-string", "skeleton": "זכין ל{X} שלא בפניו", "category": "ACQUISITION", "gloss": "..." }],
  "occurrences": [{ "formulaKey": "...", "ref": "Bava Metzia 10a:7", "tractate": "Bava Metzia", "daf": "10a", "textVowel": "...", "textPlain": "...", "sugyaRef": "Bava Metzia 10a:5-9", "caseCategory": "MONETARY", "slotFillings": {"X": "אדם"} }],
  "pairs": [{ "formulaKey": "...", "caseARef": "...", "caseBRef": "...", "distanceDaf": 90, "outcomeContrast": true, "contrastNotes": "...", "confidence": 0.93 }]
}
```
All imported rows get `verified=false`. `textVowel`/`textPlain` must be verbatim Sefaria text
(the import endpoint re-verifies each occurrence against the CachedRef/Sefaria text and rejects
mismatches — hard rule 1).
