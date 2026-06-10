# Jewoulingo

A Duolingo-style app that teaches a beginner to independently read and translate
Talmudic Aramaic — to **lein**. North star: make the app unnecessary.

This repository implements **Product 2 (Syntax Layering)** and **Product 4 (The
Outside)** plus the shared infrastructure they ride on.

## Layout

| Path | What it is |
|---|---|
| `server/` | Node/Express + Prisma + PostgreSQL API. Sefaria client, FSRS scheduler, coverage gate, Claude grading/generation, admin verification endpoints. |
| `client/` | React 18 + Vite + Tailwind + Framer Motion + Zustand learner app (parchment design system) and `/admin` verification UI. |
| `pipeline/` | Python AI cross-Shas formula discovery engine (`discover` CLI). Mines function-word skeletons across tractates, ranks candidate pairs, exports to the server import endpoint. |
| `docs/API.md` | The API contract between all three. |

## Hard rules (enforced in code)

1. **Zero model-generated Aramaic.** All Hebrew/Aramaic on screen comes verbatim
   from the Sefaria API (William Davidson Talmud) via `CachedRef`. The pipeline
   import endpoint re-verifies every occurrence against Sefaria text; the
   explainer generator rejects any output containing Hebrew characters.
2. **Human verification gates everything.** Every Claude/pipeline-produced row is
   `verified=false` until a human flips it in `/admin/pairs` or `/admin/sugyot`.
   Learner routes only ever serve `verified=true` rows.
3. **70% coverage rule, server-side.** No case/sentence is served unless the user
   knows ≥70% of its words (lesson-introduced new words, within the pair's
   explicit budget, are exempt because they're taught first).
4. **< 90 seconds to learning, no signup.** `POST /api/session/anon` + the seed
   pair flow.

## Quick start

```bash
# 1. database
createdb jewoulingo
cp server/.env.example server/.env   # set DATABASE_URL, ANTHROPIC_API_KEY, ADMIN_KEY

# 2. install + migrate + seed (seeding fetches BM 10a / Gittin 11b from Sefaria)
npm install
npm run prisma:migrate --workspace=server
npm run seed --workspace=server

# 3. run
npm run dev      # server :4000, client :5173
```

The seed installs the ~300-word function core, the P4 move taxonomy, and the
**confirmed seed pair** — `זָכִין לְאָדָם שֶׁלֹּא בְּפָנָיו` in Bava Metzia 10a (where the
formula *fails*) vs Gittin 11b (where it *succeeds*, ~90 daf away). Same
formula, opposite outcome — that contrast is the lesson.

## Discovery pipeline

```bash
cd pipeline
pip install -e . && pip install pytest requests
discover ingest --tractate "Bava Metzia"     # fetch + cache from Sefaria
discover mine --tractates "Bava Metzia,Gittin,Bava Kamma"
discover pairs --top 30 --out candidates.json
discover push --server http://localhost:4000 --key $ADMIN_KEY
```

Candidates land in `/admin/pairs` with confidence scores and evidence for human
verification. Nothing unverified is taught.

## Tests

```bash
npm test                      # server unit tests (FSRS, coverage, normalization)
cd pipeline && python -m pytest   # discovery engine tests (offline fixtures)
```

## Open research questions (flagged, not guessed)

- Exact n-gram window / normalization rules separating "formula" from coincidence.
- The full question/objection sub-type list and triggering formulas (taxonomy 4.1).
- Whether outcome-contrast pairs deserve a dedicated lesson archetype (the seed pair suggests yes).
- How aggressively to auto-link sugyot in the Obsidian-style logic view before human review.
