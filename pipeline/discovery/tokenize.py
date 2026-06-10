"""Word-level tokenization of normalized text.

Operates on the output of :func:`discovery.normalize.normalize` (plain layer,
single-space separated). Tokens are whitespace-delimited words; no further
splitting is done here — clitic prefixes are handled downstream by
:mod:`discovery.extract` when building skeletons.
"""

from __future__ import annotations


def tokenize(text: str) -> list[str]:
    """Split normalized text into word tokens.

    Empty/whitespace-only input yields an empty list. Tokenization is
    reversible against normalized text via ``" ".join(tokens)``.
    """
    return text.split() if text and not text.isspace() else []
