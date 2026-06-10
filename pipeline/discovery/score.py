"""Pair scoring: rank candidate (Case A, Case B) occurrence pairs.

For a teachable pair we score five signals (product brief 2.1):

* **distance** — far-apart tractates score higher (the "~90 daf away"
  surprise factor), measured as cumulative-daf distance across the Shas;
* **skeleton identity** — exact function-skeleton match scores highest
  (1.0 within a single formula's occurrences, since extraction already
  groups by exact skeleton);
* **outcome contrast** — same formula, different legal result is gold; we
  use a negation-proximity heuristic: one window's surrounding segment carries
  a negator (לא/אין/...) near the formula and the other does not;
* **coverage fit** — both segments buildable from the function-word core plus
  a small new-word budget;
* **length** — short, self-contained passages score higher for beginners.

The weighted composite is squashed to a confidence in [0, 1]. Every emitted
pair is a CANDIDATE for human verification (hard rule 2).
"""

from __future__ import annotations

from dataclasses import dataclass

from itertools import combinations

from .cluster import ClusteredOccurrence, cluster_formula, distinct_sugyot
from .extract import Formula
from .function_words import is_function
from .sefaria import BAVLI_TRACTATES, TRACTATE_ORDER
from .tokenize import tokenize

# Cumulative daf offset at the START of each tractate (each starts on daf 2,
# so a tractate contributes (last_daf - 1) dapim).
_CUMULATIVE_OFFSET: dict[str, int] = {}
_running = 0
for _name in TRACTATE_ORDER:
    _CUMULATIVE_OFFSET[_name] = _running
    _running += BAVLI_TRACTATES[_name] - 1
_TOTAL_DAPIM = _running

# Negators whose presence near the formula flips the outcome (heuristic).
_NEGATORS = {"לא", "אין", "לאו", "אינו", "אינה", "אינן", "ליכא", "לית", "ליתא", "פטור", "פסול", "אסור"}

# Scoring weights (sum need not be 1; composite is normalized then squashed).
W_DISTANCE = 0.30
W_SKELETON = 0.15
W_CONTRAST = 0.30
W_COVERAGE = 0.15
W_LENGTH = 0.10


@dataclass(frozen=True)
class PairScore:
    distance_daf: int
    skeleton_identity: float
    outcome_contrast: bool
    coverage_fit: float
    length_score: float
    confidence: float
    contrast_notes: str


def cumulative_daf(tractate: str, amud_number: int) -> int:
    """Absolute daf position of (tractate, daf) across the whole Shas.

    Tractates begin on daf 2, so daf 2 maps to the tractate's start offset
    (the first daf is position 0 within the tractate)."""
    return _CUMULATIVE_OFFSET.get(tractate, 0) + (amud_number - 2)


def daf_distance(a: ClusteredOccurrence, b: ClusteredOccurrence) -> int:
    """Absolute cross-Shas daf distance between two occurrences."""
    return abs(
        cumulative_daf(a.occurrence.tractate, a.amud_number)
        - cumulative_daf(b.occurrence.tractate, b.amud_number)
    )


def _has_negator_near(window_plain: str) -> bool:
    return any(tok in _NEGATORS for tok in tokenize(window_plain))


def coverage_fit(window_plain: str, new_word_budget: int = 5) -> float:
    """Fraction of tokens that are function words, credited a small budget.

    A window that is all function words scores 1.0; content words beyond the
    new-word budget pull the score down. This approximates "buildable from the
    300-word core plus a few new words".
    """
    tokens = tokenize(window_plain)
    if not tokens:
        return 0.0
    content = [t for t in tokens if not is_function(t)]
    chargeable = max(0, len(content) - new_word_budget)
    return max(0.0, 1.0 - chargeable / len(tokens))


def _length_score(a: ClusteredOccurrence, b: ClusteredOccurrence) -> float:
    longest = max(
        len(tokenize(a.occurrence.window_plain)),
        len(tokenize(b.occurrence.window_plain)),
    )
    # 2-token windows -> ~1.0; 8-token windows -> ~0.25
    return max(0.0, min(1.0, 2.0 / longest)) if longest else 0.0


def score_pair(
    a: ClusteredOccurrence, b: ClusteredOccurrence, new_word_budget: int = 5
) -> PairScore:
    """Score one (A, B) occurrence pair of the SAME formula."""
    dist = daf_distance(a, b)
    distance_norm = min(1.0, dist / _TOTAL_DAPIM * 6.0)  # ~saturates near 1/6 of Shas
    skeleton_identity = 1.0 if a.occurrence.skeleton == b.occurrence.skeleton else 0.0

    # outcome contrast is judged on the enclosing segment, not just the
    # formula span: a negator (לא/אין/פטור/...) anywhere in the surrounding
    # sugya text is what flips the legal result.
    neg_a = _has_negator_near(a.occurrence.segment_plain)
    neg_b = _has_negator_near(b.occurrence.segment_plain)
    outcome_contrast = neg_a != neg_b
    contrast_notes = (
        "Heuristic: one occurrence carries a negator near the formula and the "
        "other does not — candidate same-formula/opposite-outcome pair. "
        "REQUIRES human confirmation of the actual legal results."
        if outcome_contrast
        else "No negation asymmetry detected near the formula (heuristic)."
    )

    cov = min(
        coverage_fit(a.occurrence.window_plain, new_word_budget),
        coverage_fit(b.occurrence.window_plain, new_word_budget),
    )
    length_score = _length_score(a, b)

    raw = (
        W_DISTANCE * distance_norm
        + W_SKELETON * skeleton_identity
        + W_CONTRAST * (1.0 if outcome_contrast else 0.0)
        + W_COVERAGE * cov
        + W_LENGTH * length_score
    )
    confidence = raw / (W_DISTANCE + W_SKELETON + W_CONTRAST + W_COVERAGE + W_LENGTH)

    return PairScore(
        distance_daf=dist,
        skeleton_identity=skeleton_identity,
        outcome_contrast=outcome_contrast,
        coverage_fit=cov,
        length_score=length_score,
        confidence=round(confidence, 4),
        contrast_notes=contrast_notes,
    )


def best_pair_for_formula(
    formula: Formula, new_word_budget: int = 5
) -> tuple[ClusteredOccurrence, ClusteredOccurrence, PairScore] | None:
    """Return the highest-confidence (A, B) pair among a formula's distinct
    sugyot, or ``None`` if it occurs in fewer than two distinct sugyot."""
    clustered = distinct_sugyot(cluster_formula(formula))
    if len(clustered) < 2:
        return None
    best: tuple[ClusteredOccurrence, ClusteredOccurrence, PairScore] | None = None
    for a, b in combinations(clustered, 2):
        score = score_pair(a, b, new_word_budget)
        if best is None or score.confidence > best[2].confidence:
            best = (a, b, score)
    return best


def rank_pairs(
    formulas: dict[str, Formula],
    top_n: int = 30,
    new_word_budget: int = 5,
) -> list[tuple[Formula, ClusteredOccurrence, ClusteredOccurrence, PairScore]]:
    """Rank one best pair per formula, descending by confidence."""
    ranked: list[
        tuple[Formula, ClusteredOccurrence, ClusteredOccurrence, PairScore]
    ] = []
    for formula in formulas.values():
        best = best_pair_for_formula(formula, new_word_budget)
        if best is None:
            continue
        a, b, score = best
        ranked.append((formula, a, b, score))
    ranked.sort(key=lambda r: r[3].confidence, reverse=True)
    return ranked[:top_n]
