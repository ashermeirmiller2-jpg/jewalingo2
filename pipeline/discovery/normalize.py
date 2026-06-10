"""Text normalization: nikud stripping and orthographic canonicalization.

The normalized ("plain") layer is a deterministic, lossy projection of the
verbatim Sefaria text. The verbatim vowelized text is always kept alongside
it (hard rule 1); normalization exists only so that mining and matching can
compare occurrences orthography-insensitively.

Rules:

* nikud + cantillation marks are removed;
* final letters are KEPT as-is (no ך->כ folding);
* maqaf (U+05BE) becomes a space;
* punctuation (Latin and Hebrew, including geresh/gershayim and sof pasuq)
  is removed;
* HTML markup that Sefaria embeds (e.g. ``<b>``, ``<i>``, ``<br>``) is
  stripped;
* whitespace is collapsed;
* a small curated map canonicalizes common orthographic variants
  (plene/defective spellings) at the token level.
"""

from __future__ import annotations

import re
import unicodedata

# Hebrew points & cantillation: U+0591..U+05BD, U+05BF, U+05C1, U+05C2,
# U+05C4, U+05C5, U+05C7. (U+05BE maqaf and U+05C0/U+05C3 punctuation are
# handled separately below.)
_NIKUD_RE = re.compile(r"[֑-ׇֽֿׁׂׅׄ]")

_HTML_TAG_RE = re.compile(r"<[^>]+>")

_MAQAF = "־"

# Punctuation removed outright (replaced by a space, then collapsed):
# Hebrew sof pasuq / paseq / geresh / gershayim plus common ASCII/typographic
# punctuation that appears in the Davidson vocalized text.
_PUNCT_RE = re.compile(r"[׀׃׳״!\"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~–—‘’“”…]")

_WS_RE = re.compile(r"\s+")

# Curated orthographic variant map (token level): variant spelling -> canonical
# spelling. These are spelling normalizations of the SAME word (mostly
# plene/defective alternations), not text generation; the canonical forms are
# only used in the normalized parallel layer, never shown as source text.
VARIANT_MAP: dict[str, str] = {
    "מלתא": "מילתא",  # defective -> plene "matter/word"
    "מלי": "מילי",  # defective -> plene "words/matters"
    "דלמא": "דילמא",  # defective -> plene "perhaps"
    "הילכך": "הלכך",  # plene -> standard "therefore"
    "וודאי": "ודאי",  # double-vav -> single "certainly"
    "דווקא": "דוקא",  # double-vav -> single "specifically"
    "אינש": "איניש",  # defective -> plene "person"
    "אמ": "אמר",  # manuscript-style abbreviation of "said" (post-punct strip)
}


def strip_nikud(text: str) -> str:
    """Remove Hebrew vowel points and cantillation marks.

    Letters (including final forms) and base punctuation are untouched.
    Input is NFC-normalized first so decomposed sequences are handled.
    """
    return _NIKUD_RE.sub("", unicodedata.normalize("NFC", text))


def _apply_variants(tokens: list[str]) -> list[str]:
    return [VARIANT_MAP.get(t, t) for t in tokens]


def normalize(text: str) -> str:
    """Full normalization pipeline: verbatim text -> plain matching layer.

    Order: strip HTML -> strip nikud -> maqaf to space -> drop punctuation ->
    collapse whitespace -> canonicalize token-level orthographic variants.
    """
    out = _HTML_TAG_RE.sub(" ", text)
    out = strip_nikud(out)
    out = out.replace(_MAQAF, " ")
    out = _PUNCT_RE.sub(" ", out)
    out = _WS_RE.sub(" ", out).strip()
    return " ".join(_apply_variants(out.split(" "))) if out else ""
