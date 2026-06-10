"""Sefaria API client for the William Davidson Talmud (Aramaic layer).

Fetches per-segment text for whole tractates via
``https://www.sefaria.org/api/v3/texts/{ref}``, with:

* a local JSON file cache under ``pipeline/cache/`` (one file per daf), so
  the pipeline is fully usable offline once a tractate has been ingested;
* polite rate limiting (a fixed sleep between live HTTP calls);
* retries with exponential backoff on transient failures.

Hard rule 1: the text returned here is stored verbatim. ``Segment.text_vowel``
is the exact string Sefaria returned for that segment (vowelized, possibly
containing punctuation/HTML markup as delivered); ``Segment.text_plain`` is a
nikud-stripped normalized parallel produced by :mod:`discovery.normalize`.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterator, Optional

import requests

from .normalize import normalize

SEFARIA_API_BASE = "https://www.sefaria.org/api/v3/texts/"

# The 37 tractates of the Babylonian Talmud (Sefaria English names), in
# standard Vilna Shas order, mapped to the number of the LAST daf in the
# standard (Vilna) printing. Every tractate starts on daf 2.
BAVLI_TRACTATES: dict[str, int] = {
    # Zeraim
    "Berakhot": 64,
    # Moed
    "Shabbat": 157,
    "Eruvin": 105,
    "Pesachim": 121,
    "Rosh Hashanah": 35,
    "Yoma": 88,
    "Sukkah": 56,
    "Beitzah": 40,
    "Taanit": 31,
    "Megillah": 32,
    "Moed Katan": 29,
    "Chagigah": 27,
    # Nashim
    "Yevamot": 122,
    "Ketubot": 112,
    "Nedarim": 91,
    "Nazir": 66,
    "Sotah": 49,
    "Gittin": 90,
    "Kiddushin": 82,
    # Nezikin
    "Bava Kamma": 119,
    "Bava Metzia": 119,
    "Bava Batra": 176,
    "Sanhedrin": 113,
    "Makkot": 24,
    "Shevuot": 49,
    "Avodah Zarah": 76,
    "Horayot": 14,
    # Kodashim
    "Zevachim": 120,
    "Menachot": 110,
    "Chullin": 142,
    "Bekhorot": 61,
    "Arakhin": 34,
    "Temurah": 34,
    "Keritot": 28,
    "Meilah": 22,
    "Tamid": 33,
    # Taharot
    "Niddah": 73,
}

#: Tractate names in canonical Shas order (used for cross-tractate daf math).
TRACTATE_ORDER: list[str] = list(BAVLI_TRACTATES.keys())

#: Default cache directory: pipeline/cache/ (this file lives in pipeline/discovery/).
DEFAULT_CACHE_DIR: Path = Path(__file__).resolve().parent.parent / "cache"


@dataclass(frozen=True)
class Segment:
    """A single text segment (one Sefaria segment of one amud).

    ``text_vowel`` is verbatim Sefaria text (hard rule 1); ``text_plain`` is
    the nikud-stripped normalized parallel.
    """

    ref: str  # e.g. "Bava Metzia 10a:7"
    tractate: str  # e.g. "Bava Metzia"
    daf: str  # e.g. "10a"
    index: int  # 1-based segment number within the daf
    text_vowel: str
    text_plain: str


def daf_refs(tractate: str) -> Iterator[str]:
    """Yield every daf-amud name of ``tractate``: "2a", "2b", ..., "{last}b"."""
    last = BAVLI_TRACTATES[tractate]
    for n in range(2, last + 1):
        yield f"{n}a"
        yield f"{n}b"


class SefariaClient:
    """HTTP client for the Sefaria v3 texts API with caching and backoff.

    Parameters
    ----------
    cache_dir:
        Directory for the local JSON cache (default ``pipeline/cache``).
    sleep_seconds:
        Polite delay between *live* HTTP requests (cache hits do not sleep).
    max_retries:
        Number of retry attempts on transient failures (connection errors,
        HTTP 429/5xx), with exponential backoff.
    session:
        Optional pre-configured ``requests.Session`` (used by tests to inject
        a fake transport so everything runs offline).
    """

    #: Version selector for the Aramaic layer of the William Davidson Talmud.
    VERSION = "hebrew"

    def __init__(
        self,
        cache_dir: Path | str = DEFAULT_CACHE_DIR,
        sleep_seconds: float = 0.6,
        max_retries: int = 3,
        session: Optional[requests.Session] = None,
    ) -> None:
        self.cache_dir = Path(cache_dir)
        self.sleep_seconds = sleep_seconds
        self.max_retries = max_retries
        self.session = session or requests.Session()
        self._last_request_at = 0.0

    # ------------------------------------------------------------------ cache

    def _cache_path(self, tractate: str, daf: str) -> Path:
        return self.cache_dir / tractate.replace(" ", "_") / f"{daf}.json"

    def _cache_read(self, tractate: str, daf: str) -> Optional[dict[str, Any]]:
        path = self._cache_path(tractate, daf)
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return None

    def _cache_write(self, tractate: str, daf: str, payload: dict[str, Any]) -> None:
        path = self._cache_path(tractate, daf)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8"
        )

    # ------------------------------------------------------------------- http

    def _throttle(self) -> None:
        elapsed = time.monotonic() - self._last_request_at
        if elapsed < self.sleep_seconds:
            time.sleep(self.sleep_seconds - elapsed)
        self._last_request_at = time.monotonic()

    def _fetch_json(self, ref: str) -> dict[str, Any]:
        """GET a ref from the v3 texts API with retries and backoff."""
        url = SEFARIA_API_BASE + requests.utils.quote(ref)
        params = {"version": self.VERSION}
        delay = 1.0
        last_error: Exception | None = None
        for attempt in range(self.max_retries + 1):
            self._throttle()
            try:
                resp = self.session.get(url, params=params, timeout=30)
                if resp.status_code in (429,) or resp.status_code >= 500:
                    raise requests.HTTPError(
                        f"transient HTTP {resp.status_code} for {ref}", response=resp
                    )
                resp.raise_for_status()
                return resp.json()
            except (requests.ConnectionError, requests.Timeout, requests.HTTPError) as exc:
                status = getattr(getattr(exc, "response", None), "status_code", None)
                # Do not retry hard client errors other than 429.
                if status is not None and 400 <= status < 500 and status != 429:
                    raise
                last_error = exc
                if attempt < self.max_retries:
                    time.sleep(delay)
                    delay *= 2
        assert last_error is not None
        raise last_error

    # -------------------------------------------------------------------- api

    def get_daf(self, tractate: str, daf: str) -> list[Segment]:
        """Return the segments of one amud, from cache or the live API.

        A missing/empty amud (e.g. a tractate ending on side ``a``) yields an
        empty list rather than raising.
        """
        cached = self._cache_read(tractate, daf)
        if cached is None:
            ref = f"{tractate} {daf}"
            try:
                data = self._fetch_json(ref)
            except requests.HTTPError as exc:
                status = getattr(getattr(exc, "response", None), "status_code", None)
                if status == 404:
                    data = {"versions": []}
                else:
                    raise
            cached = {"ref": ref, "raw": data}
            self._cache_write(tractate, daf, cached)
        return self._segments_from_response(tractate, daf, cached["raw"])

    @staticmethod
    def _segments_from_response(
        tractate: str, daf: str, data: dict[str, Any]
    ) -> list[Segment]:
        versions = data.get("versions") or []
        if not versions:
            return []
        text = versions[0].get("text") or []
        if isinstance(text, str):  # single-segment refs come back as a string
            text = [text]
        segments: list[Segment] = []
        for i, raw in enumerate(text, start=1):
            if not isinstance(raw, str) or not raw.strip():
                continue
            segments.append(
                Segment(
                    ref=f"{tractate} {daf}:{i}",
                    tractate=tractate,
                    daf=daf,
                    index=i,
                    text_vowel=raw,  # VERBATIM Sefaria text — never altered.
                    text_plain=normalize(raw),
                )
            )
        return segments

    def get_tractate(self, name: str) -> list[Segment]:
        """Fetch every segment of ``name`` (Aramaic layer), daf by daf."""
        if name not in BAVLI_TRACTATES:
            raise KeyError(
                f"Unknown tractate {name!r}; expected one of {TRACTATE_ORDER}"
            )
        segments: list[Segment] = []
        for daf in daf_refs(name):
            segments.extend(self.get_daf(name, daf))
        return segments
