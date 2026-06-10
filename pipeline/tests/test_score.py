"""Tests for pair scoring + ranking (test-fixture Hebrew only)."""

from discovery.cluster import cluster_formula, distinct_sugyot
from discovery.extract import SLOT, extract_formulas, recurring_formulas
from discovery.score import (
    cumulative_daf,
    daf_distance,
    rank_pairs,
    score_pair,
)


def _clustered(zakhin_segments):
    formulas = extract_formulas(zakhin_segments)
    formula = formulas[f"זכין {SLOT} שלא בפניו"]
    return distinct_sugyot(cluster_formula(formula)), formula


def test_cross_tractate_distance_is_large(zakhin_segments):
    clustered, _ = _clustered(zakhin_segments)
    a, b = clustered[0], clustered[1]
    # Bava Metzia and Gittin are far apart in Shas order
    assert daf_distance(a, b) > 80


def test_cumulative_daf_orders_tractates():
    # Gittin precedes Bava Metzia in Shas order -> smaller cumulative offset base
    assert cumulative_daf("Berakhot", 2) == 0
    assert cumulative_daf("Bava Metzia", 10) > cumulative_daf("Gittin", 11)


def test_negation_asymmetry_flags_outcome_contrast(zakhin_segments):
    clustered, _ = _clustered(zakhin_segments)
    a, b = clustered[0], clustered[1]
    score = score_pair(a, b)
    # one fixture window is negated, the other is not
    assert score.outcome_contrast is True
    assert "human confirmation" in score.contrast_notes.lower()


def test_far_outcome_contrast_pair_scores_high(zakhin_segments):
    clustered, _ = _clustered(zakhin_segments)
    score = score_pair(clustered[0], clustered[1])
    assert 0.0 <= score.confidence <= 1.0
    assert score.confidence > 0.5  # far + contrast + identical skeleton


def test_rank_pairs_orders_by_confidence(zakhin_segments):
    formulas = recurring_formulas(extract_formulas(zakhin_segments), min_occurrences=2)
    ranked = rank_pairs(formulas, top_n=10)
    assert ranked, "expected at least one ranked pair"
    confidences = [r[3].confidence for r in ranked]
    assert confidences == sorted(confidences, reverse=True)
    # the seed formula (or a sub-skeleton of it anchored on זכין) must surface
    skeletons = {r[0].skeleton for r in ranked}
    assert any(sk.startswith(f"זכין {SLOT} שלא") for sk in skeletons), skeletons
    # and its best pair is a far, outcome-contrast pair
    seed = next(r for r in ranked if r[0].skeleton.startswith(f"זכין {SLOT} שלא"))
    assert seed[3].distance_daf > 80
    assert seed[3].outcome_contrast is True
