"""Tests for skeleton extraction (test-fixture Hebrew only)."""

from discovery.extract import (
    SLOT,
    extract_formulas,
    iter_segment_skeletons,
    recurring_formulas,
)
from discovery.tokenize import tokenize


def test_shared_skeleton_across_different_content(zakhin_segments):
    """The two fixtures differ only in the content slot (לאדם vs לעבד) yet must
    yield a shared skeleton — the core of syntax layering."""
    formulas = extract_formulas(zakhin_segments)
    # the exact skeleton "זכין {SLOT} שלא בפניו" must appear with 2 occurrences
    target = f"זכין {SLOT} שלא בפניו"
    assert target in formulas, list(formulas)
    assert len(formulas[target].occurrences) == 2
    refs = {o.ref for o in formulas[target].occurrences}
    assert refs == {"Bava Metzia 10a:7", "Gittin 11b:3"}


def test_skeleton_has_function_and_slot(zakhin_segments):
    formulas = extract_formulas(zakhin_segments)
    target = f"זכין {SLOT} שלא בפניו"
    formula = formulas[target]
    assert formula.slot_count >= 1
    assert formula.function_token_count >= 1
    # fillings captured the differing content words
    fills = {o.fillings for o in formula.occurrences}
    assert ("לאדם",) in fills or ("לעבד",) in fills


def test_pure_function_run_is_discarded():
    # all-function window has no content slot -> no skeleton
    tokens = tokenize("לא אין הוא")
    skeletons = list(iter_segment_skeletons(tokens))
    assert skeletons == []


def test_recurring_filter_drops_singletons(zakhin_segments):
    formulas = extract_formulas(zakhin_segments)
    recurring = recurring_formulas(formulas, min_occurrences=2)
    # the shared skeleton survives; windows unique to one segment are dropped
    assert all(len(f.occurrences) >= 2 for f in recurring.values())
    assert f"זכין {SLOT} שלא בפניו" in recurring


def test_skeleton_not_anchored_on_slot():
    # leading/trailing content should not produce a slot-edged skeleton
    tokens = tokenize("ראובן זכין שלא בפניו שמעון")
    for _, skeleton, _ in iter_segment_skeletons(tokens):
        parts = skeleton.split(" ")
        assert parts[0] != SLOT
        assert parts[-1] != SLOT
