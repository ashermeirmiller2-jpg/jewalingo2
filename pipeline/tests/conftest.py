"""Shared test fixtures.

NOTE on hard rule 1: the Hebrew strings constructed in these tests are TEST
FIXTURES, not learner-facing text. They never reach a learner and are never
presented as authoritative Sefaria text — they exist only to exercise the
normalization / extraction / scoring / output logic offline. Rule 1 (no
generated Aramaic on screen) governs the product surfaces, not the test
harness.
"""

from __future__ import annotations

from dataclasses import dataclass

import pytest


@dataclass(frozen=True)
class FakeSegment:
    """Minimal stand-in for discovery.sefaria.Segment for offline tests."""

    ref: str
    tractate: str
    daf: str
    text_vowel: str
    text_plain: str


@pytest.fixture
def zakhin_segments():
    """Two distant occurrences of the seed skeleton, one negated (contrast).

    Built from the brief-supplied formula tokens. Plain forms are pre-supplied
    so the fixtures don't depend on the normalizer under test.
    """
    return [
        FakeSegment(
            ref="Bava Metzia 10a:7",
            tractate="Bava Metzia",
            daf="10a",
            text_vowel="זָכִין לְאָדָם שֶׁלֹּא בְּפָנָיו",
            text_plain="לא זכין לאדם שלא בפניו",  # negated context
        ),
        FakeSegment(
            ref="Gittin 11b:3",
            tractate="Gittin",
            daf="11b",
            text_vowel="זָכִין לְעֶבֶד שֶׁלֹּא בְּפָנָיו",
            text_plain="זכין לעבד שלא בפניו",  # affirmative context
        ),
    ]
