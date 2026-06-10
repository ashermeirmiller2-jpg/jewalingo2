"""Tests for import-payload assembly (schema must match docs/API.md)."""

from discovery.extract import extract_formulas, recurring_formulas
from discovery.output import RankedPair, build_import_payload, categorize_case, categorize_formula
from discovery.score import rank_pairs


def _payload(zakhin_segments):
    vowel_by_ref = {s.ref: s.text_vowel for s in zakhin_segments}
    formulas = recurring_formulas(extract_formulas(zakhin_segments), min_occurrences=2)
    ranked = rank_pairs(formulas, top_n=10)
    ranked_pairs = [RankedPair(f, a, b, s) for (f, a, b, s) in ranked]
    return build_import_payload(ranked_pairs, vowel_by_ref)


def test_payload_top_level_shape(zakhin_segments):
    payload = _payload(zakhin_segments)
    assert set(payload) == {"formulas", "occurrences", "pairs"}
    assert payload["formulas"] and payload["occurrences"] and payload["pairs"]


def test_formula_fields_match_schema(zakhin_segments):
    f = _payload(zakhin_segments)["formulas"][0]
    assert set(f) >= {"key", "skeleton", "category"}
    assert f["category"] in {
        "ACQUISITION", "CONDITIONAL", "PRESUMPTION", "INFERENCE",
        "OBJECTION", "AGENCY", "COMPARISON", "OTHER",
    }


def test_occurrence_carries_verbatim_vowel(zakhin_segments):
    payload = _payload(zakhin_segments)
    by_ref = {o["ref"]: o for o in payload["occurrences"]}
    assert by_ref["Bava Metzia 10a:7"]["textVowel"] == "זָכִין לְאָדָם שֶׁלֹּא בְּפָנָיו"
    occ = by_ref["Bava Metzia 10a:7"]
    assert set(occ) >= {
        "formulaKey", "ref", "tractate", "daf",
        "textVowel", "textPlain", "sugyaRef", "caseCategory", "slotFillings",
    }
    assert occ["caseCategory"] in {
        "MONETARY", "MARITAL", "RITUAL", "DAMAGES", "AGENCY", "OTHER",
    }


def test_pair_fields_match_schema(zakhin_segments):
    p = _payload(zakhin_segments)["pairs"][0]
    assert set(p) >= {
        "formulaKey", "caseARef", "caseBRef",
        "distanceDaf", "outcomeContrast", "contrastNotes", "confidence",
    }
    assert 0.0 <= p["confidence"] <= 1.0
    assert isinstance(p["outcomeContrast"], bool)
    # references resolve to occurrences
    refs = {o["ref"] for o in _payload(zakhin_segments)["occurrences"]}
    assert p["caseARef"] in refs and p["caseBRef"] in refs


def test_occurrence_without_vowel_is_skipped():
    # an occurrence whose ref has no verbatim vowel mapping must not be emitted
    from tests.conftest import FakeSegment

    segs = [
        FakeSegment("X 2a:1", "Bava Metzia", "2a", "זכין לאדם שלא בפניו", "זכין לאדם שלא בפניו"),
        FakeSegment("X 2a:2", "Gittin", "11b", "זכין לעבד שלא בפניו", "זכין לעבד שלא בפניו"),
    ]
    formulas = recurring_formulas(extract_formulas(segs), min_occurrences=2)
    ranked = rank_pairs(formulas, top_n=10)
    ranked_pairs = [RankedPair(f, a, b, s) for (f, a, b, s) in ranked]
    payload = build_import_payload(ranked_pairs, {})  # empty vowel map
    assert payload["occurrences"] == []
    assert payload["pairs"] == []


def test_categorizers():
    assert categorize_formula("זכין {SLOT} שלא בפניו") == "ACQUISITION"
    assert categorize_case("Gittin") == "MARITAL"
    assert categorize_case("Bava Metzia") == "MONETARY"
    assert categorize_case("Unknown Tractate") == "OTHER"
