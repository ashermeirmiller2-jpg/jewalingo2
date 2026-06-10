# Jewoulingo Discovery Pipeline

The AI **Cross-Shas Formula Discovery Engine** (Product 2, §2.1). It mines
recurring function-word *skeletons* across the Babylonian Talmud (William
Davidson edition, Aramaic layer, via the Sefaria API), clusters their
occurrences, and ranks candidate teachable **pairs** for human verification.

It replaces hand-curation: the engine *proposes* pairs with confidence scores
and evidence; a human *disposes* in the server's `/admin/pairs` UI. Nothing
unverified is ever taught.

## Hard rules honored

1. **Verbatim text only.** Every occurrence carries the exact Sefaria
   `textVowel` for its ref. This package never generates, paraphrases, or
   reconstructs Hebrew/Aramaic — it only computes a normalized *plain*
   projection for matching. The server re-verifies each occurrence against
   Sefaria on import.
2. **Everything is a candidate.** Output imports as `verified=false`, with a
   confidence score and contrast notes attached.

## Stages

| Module | Role |
|---|---|
| `sefaria.py` | Typed client for `api/v3/texts`, local JSON cache under `cache/`, polite rate-limiting + backoff. 37 Bavli tractates with daf counts. |
| `normalize.py` | Verbatim → plain projection: strip nikud/HTML, maqaf→space, drop punctuation, canonicalize a curated orthographic-variant map. |
| `tokenize.py` | Word-level tokenization of the plain layer. |
| `function_words.py` | The ~300-word structural core (dictionary headwords + glosses); `is_function()` handles single clitic ו/ד/ש prefixes. |
| `extract.py` | Mine n-grams (n=2..8); abstract content tokens to `{SLOT}`, keep function tokens literal. A formula = a function-word skeleton with ≥1 slot, anchored on function words. |
| `cluster.py` | Enrich occurrences with daf/amud + a ±2-segment sugya window; reduce to one occurrence per distinct sugya. |
| `score.py` | Rank pairs by distance (cross-Shas daf gap), skeleton identity, outcome-contrast (negation asymmetry in the surrounding segment), coverage fit, and length → confidence ∈ [0,1]. |
| `output.py` | Assemble the `POST /admin/import/candidates` JSON (see `docs/API.md`); `post_to_server()` helper. |
| `cli.py` | `discover ingest \| mine \| pairs \| push`. |

## Usage

```bash
pip install -e .            # installs the `discover` console script
pip install pytest requests

discover ingest --tractate "Bava Metzia"          # fetch + cache (Sefaria)
discover ingest --tractate "Gittin"
discover mine   --tractates "Bava Metzia,Gittin"  # quick skeleton census
discover pairs  --tractates "Bava Metzia,Gittin" --top 30 --out candidates.json
discover push   --in candidates.json --server http://localhost:4000 --key "$ADMIN_KEY"
```

`mine` and `pairs` read from the local cache populated by `ingest`, so they run
fully offline once tractates are ingested.

## Tests

```bash
python -m pytest          # offline; uses transliterated/dummy Hebrew fixtures
```

Fixtures construct Hebrew test strings to exercise the logic offline. These are
test fixtures, never learner-facing text — hard rule 1 governs the product
surfaces, not the harness.

## Tuning knobs (open research, §"Open research questions")

- `extract.MIN_N` / `MAX_N` — the n-gram window separating "formula" from coincidence.
- `score.W_*` — the five scoring weights.
- `score._NEGATORS` — the negation lexicon behind the outcome-contrast heuristic.
- `--min-occurrences`, `--new-word-budget` — recurrence and coverage thresholds.
