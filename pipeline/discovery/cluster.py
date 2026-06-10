"""Clustering: group formula occurrences across the corpus.

Extraction already groups windows by exact skeleton (see
:mod:`discovery.extract`). This module records, for each formula, the
tractate/daf/amud spread of its occurrences and the surrounding sugya window,
and exposes helpers for selecting occurrences that sit in *distinct* sugyot
(so a teachable pair is two genuinely different discussions, not the same
phrase twice on one daf).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable

from .extract import Formula, Occurrence

_DAF_RE = re.compile(r"^(\d+)([ab])$")


@dataclass(frozen=True)
class ClusteredOccurrence:
    """An occurrence enriched with its enclosing sugya reference window."""

    occurrence: Occurrence
    sugya_ref: str  # e.g. "Bava Metzia 10a:5-9"
    amud_number: int  # numeric daf, e.g. 10
    amud_side: str  # "a" or "b"


def parse_daf(daf: str) -> tuple[int, str]:
    """Parse "10a" -> (10, "a"). Raises ValueError on malformed input."""
    m = _DAF_RE.match(daf)
    if not m:
        raise ValueError(f"malformed daf {daf!r}")
    return int(m.group(1)), m.group(2)


def _segment_index(ref: str) -> int | None:
    if ":" in ref:
        tail = ref.rsplit(":", 1)[1]
        if tail.isdigit():
            return int(tail)
    return None


def sugya_window(ref: str, radius: int = 2) -> str:
    """Build a sugya ref window of +-``radius`` segments around ``ref``.

    "Bava Metzia 10a:7" -> "Bava Metzia 10a:5-9". If the ref has no segment
    index, it is returned unchanged.
    """
    idx = _segment_index(ref)
    if idx is None:
        return ref
    base = ref.rsplit(":", 1)[0]
    lo = max(1, idx - radius)
    hi = idx + radius
    return f"{base}:{lo}-{hi}"


def cluster_formula(formula: Formula, radius: int = 2) -> list[ClusteredOccurrence]:
    """Enrich every occurrence of a formula with sugya + daf metadata."""
    clustered: list[ClusteredOccurrence] = []
    for occ in formula.occurrences:
        try:
            amud_number, amud_side = parse_daf(occ.daf)
        except ValueError:
            continue
        clustered.append(
            ClusteredOccurrence(
                occurrence=occ,
                sugya_ref=sugya_window(occ.ref, radius),
                amud_number=amud_number,
                amud_side=amud_side,
            )
        )
    return clustered


def distinct_sugyot(
    clustered: Iterable[ClusteredOccurrence],
) -> list[ClusteredOccurrence]:
    """One representative occurrence per distinct sugya window.

    Keeps the first occurrence seen for each ``sugya_ref`` so that pair
    scoring never compares an occurrence against itself or against the same
    phrase repeated within one discussion.
    """
    seen: set[str] = set()
    out: list[ClusteredOccurrence] = []
    for c in clustered:
        if c.sugya_ref in seen:
            continue
        seen.add(c.sugya_ref)
        out.append(c)
    return out
