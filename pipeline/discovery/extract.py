"""Formula extraction: mine recurring function-word skeletons.

A *formula* is a function-word skeleton with one or more content slots. We
slide a window (n = 2..8 tokens) over each segment's normalized tokens, and
abstract every content (non-function) token into a ``{SLOT}`` marker while
keeping function tokens literal. Two windows that produce the same skeleton
string — even with different content words filling the slots — are
occurrences of the same formula.

Example::

    "זכין לאדם שלא בפניו"   -> skeleton "זכין {SLOT} שלא בפניו"  (לאדם is content)
    "זכין לעבד שלא בפניו"   -> same skeleton, slot filled by לעבד

A skeleton is only considered teachable if it contains at least one function
word and at least one content slot (a pure run of function words, or a window
with no function anchor at all, is discarded — those are not distinctive
formulas).

Hard rule 1: only normalized projections of verbatim Sefaria text are used
here; nothing is generated.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from typing import Iterable, Sequence

from .function_words import is_function
from .tokenize import tokenize

SLOT = "{SLOT}"

MIN_N = 2
MAX_N = 8


@dataclass(frozen=True)
class Occurrence:
    """One window in one segment that matched a skeleton."""

    ref: str
    tractate: str
    daf: str
    start: int  # token offset of the window within the segment
    skeleton: str
    fillings: tuple[str, ...]  # content tokens that filled the slots, in order
    window_plain: str  # the matched plain tokens, space-joined
    segment_plain: str  # the full enclosing segment (for context heuristics)


@dataclass
class Formula:
    """A function-word skeleton and all its observed occurrences."""

    skeleton: str
    occurrences: list[Occurrence] = field(default_factory=list)

    @property
    def slot_count(self) -> int:
        return self.skeleton.count(SLOT)

    @property
    def function_token_count(self) -> int:
        return sum(1 for t in self.skeleton.split(" ") if t != SLOT)


def _skeletonize(tokens: Sequence[str]) -> tuple[str, tuple[str, ...]] | None:
    """Turn a window of plain tokens into (skeleton, fillings).

    Returns ``None`` if the window is not a teachable skeleton: it must
    contain at least one function word AND at least one content slot, and must
    not begin or end on a slot (anchoring the formula on function words keeps
    the boundaries meaningful).
    """
    parts: list[str] = []
    fillings: list[str] = []
    fn_count = 0
    for tok in tokens:
        if is_function(tok):
            parts.append(tok)
            fn_count += 1
        else:
            parts.append(SLOT)
            fillings.append(tok)
    if fn_count == 0 or not fillings:
        return None
    if parts[0] == SLOT or parts[-1] == SLOT:
        return None
    # collapse adjacent slots: "X Y" of two content words is one logical slot
    collapsed: list[str] = []
    for p in parts:
        if p == SLOT and collapsed and collapsed[-1] == SLOT:
            continue
        collapsed.append(p)
    return " ".join(collapsed), tuple(fillings)


def iter_segment_skeletons(
    plain_tokens: Sequence[str],
) -> Iterable[tuple[int, str, tuple[str, ...]]]:
    """Yield (start, skeleton, fillings) for every teachable window."""
    n_tokens = len(plain_tokens)
    seen: set[tuple[int, str]] = set()
    for n in range(MIN_N, MAX_N + 1):
        for start in range(0, n_tokens - n + 1):
            window = plain_tokens[start : start + n]
            result = _skeletonize(window)
            if result is None:
                continue
            skeleton, fillings = result
            key = (start, skeleton)
            if key in seen:
                continue
            seen.add(key)
            yield start, skeleton, fillings


def extract_formulas(segments: Iterable["SegmentLike"]) -> dict[str, Formula]:
    """Mine all formulas across a collection of segments.

    ``segments`` is any iterable of objects exposing ``ref``, ``tractate``,
    ``daf`` and ``text_plain`` (e.g. :class:`discovery.sefaria.Segment`).
    Returns a mapping skeleton -> :class:`Formula`.
    """
    formulas: dict[str, Formula] = {}
    for seg in segments:
        tokens = tokenize(seg.text_plain)
        for start, skeleton, fillings in iter_segment_skeletons(tokens):
            formula = formulas.get(skeleton)
            if formula is None:
                formula = formulas[skeleton] = Formula(skeleton=skeleton)
            window_plain = " ".join(tokens[start : start + len(skeleton.split(" "))])
            formula.occurrences.append(
                Occurrence(
                    ref=seg.ref,
                    tractate=seg.tractate,
                    daf=seg.daf,
                    start=start,
                    skeleton=skeleton,
                    fillings=fillings,
                    window_plain=window_plain,
                    segment_plain=seg.text_plain,
                )
            )
    return formulas


def recurring_formulas(
    formulas: dict[str, Formula], min_occurrences: int = 2
) -> dict[str, Formula]:
    """Keep only formulas seen at least ``min_occurrences`` times."""
    return {
        sk: f for sk, f in formulas.items() if len(f.occurrences) >= min_occurrences
    }


# Structural protocol for type hints without importing sefaria (avoids a cycle
# in tests that pass lightweight fixture objects).
class SegmentLike:  # pragma: no cover - typing aid only
    ref: str
    tractate: str
    daf: str
    text_plain: str
