"""Tests for tokenization."""

from discovery.tokenize import tokenize


def test_splits_on_whitespace():
    assert tokenize("זכין לאדם שלא בפניו") == ["זכין", "לאדם", "שלא", "בפניו"]


def test_empty_and_whitespace():
    assert tokenize("") == []
    assert tokenize("   ") == []


def test_roundtrip_against_joined_tokens():
    text = "אמר רבא הכי"
    assert " ".join(tokenize(text)) == text
