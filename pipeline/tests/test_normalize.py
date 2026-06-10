"""Tests for normalization (test-fixture Hebrew only; see conftest note)."""

from discovery.normalize import normalize, strip_nikud
from discovery.tokenize import tokenize


def test_strip_nikud_keeps_consonants():
    assert strip_nikud("זָכִין לְאָדָם שֶׁלֹּא בְּפָנָיו") == "זכין לאדם שלא בפניו"


def test_maqaf_becomes_space():
    assert normalize("אִי־נַמִי") == "אי נמי"


def test_html_is_stripped():
    assert normalize("<b>אמר</b> רבא") == "אמר רבא"


def test_punctuation_removed_and_whitespace_collapsed():
    assert normalize("אמר   רבא, .") == "אמר רבא"


def test_variant_map_canonicalizes_tokens():
    # "מלתא" (defective) canonicalizes to "מילתא" (plene)
    assert normalize("מלתא") == "מילתא"


def test_final_letters_preserved():
    # no ך->כ folding
    assert "ך" in normalize("הילך")


def test_empty_input():
    assert normalize("") == ""
    assert normalize("   ") == ""
    assert tokenize(normalize("")) == []
