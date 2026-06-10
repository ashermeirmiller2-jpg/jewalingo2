"""Output: assemble ranked candidates into the server import JSON.

Produces exactly the shape consumed by ``POST /admin/import/candidates``
(see ``docs/API.md``)::

    {"formulas": [...], "occurrences": [...], "pairs": [...]}

Every occurrence carries the VERBATIM Sefaria ``textVowel`` for its ref; the
server re-verifies each against Sefaria before storing (hard rule 1). All rows
import as ``verified=false`` (hard rule 2).
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Iterable, Mapping

import requests

from .cluster import ClusteredOccurrence
from .extract import SLOT, Formula
from .score import PairScore

# --- heuristic categorizers (CANDIDATE labels; humans confirm) ---------------

# Formula category by characteristic function word in the skeleton.
_FORMULA_CATEGORY_CUES: list[tuple[str, str]] = [
    ("זכין", "ACQUISITION"),
    ("קנה", "ACQUISITION"),
    ("קני", "ACQUISITION"),
    ("קנין", "ACQUISITION"),
    ("אילימא", "CONDITIONAL"),
    ("אי", "CONDITIONAL"),
    ("אם", "CONDITIONAL"),
    ("חזקה", "PRESUMPTION"),
    ("שכן", "INFERENCE"),
    ("מצינו", "INFERENCE"),
    ("מנלן", "INFERENCE"),
    ("שליח", "AGENCY"),
    ("שליחות", "AGENCY"),
    ("היכי", "COMPARISON"),
    ("קשיא", "OBJECTION"),
    ("תיובתא", "OBJECTION"),
    ("והא", "OBJECTION"),
]

# Case (subject) category by tractate.
_TRACTATE_CASE_CATEGORY: dict[str, str] = {
    "Bava Kamma": "DAMAGES",
    "Bava Metzia": "MONETARY",
    "Bava Batra": "MONETARY",
    "Gittin": "MARITAL",
    "Kiddushin": "MARITAL",
    "Ketubot": "MARITAL",
    "Yevamot": "MARITAL",
    "Nazir": "RITUAL",
    "Nedarim": "RITUAL",
    "Zevachim": "RITUAL",
    "Menachot": "RITUAL",
    "Chullin": "RITUAL",
    "Berakhot": "RITUAL",
    "Sanhedrin": "DAMAGES",
    "Makkot": "DAMAGES",
}


def categorize_formula(skeleton: str) -> str:
    tokens = set(skeleton.split(" "))
    for cue, category in _FORMULA_CATEGORY_CUES:
        if cue in tokens:
            return category
    return "OTHER"


def categorize_case(tractate: str) -> str:
    return _TRACTATE_CASE_CATEGORY.get(tractate, "OTHER")


def _slot_fillings(fillings: tuple[str, ...]) -> dict[str, str]:
    return {f"slot{i + 1}": f for i, f in enumerate(fillings)}


@dataclass(frozen=True)
class RankedPair:
    """A scored, teachable pair plus its two clustered occurrences."""

    formula: Formula
    case_a: ClusteredOccurrence
    case_b: ClusteredOccurrence
    score: PairScore


def build_import_payload(
    ranked: Iterable[RankedPair],
    segment_vowel_by_ref: Mapping[str, str],
) -> dict:
    """Build the import JSON from ranked pairs.

    ``segment_vowel_by_ref`` maps a segment ref ("Bava Metzia 10a:7") to its
    verbatim vowelized Sefaria text — the occurrence's ``textVowel``. Refs
    absent from the map are skipped (we never invent text).
    """
    formulas: dict[str, dict] = {}
    occurrences: dict[str, dict] = {}
    pairs: list[dict] = []

    def formula_key(skeleton: str) -> str:
        return skeleton

    def add_formula(formula: Formula) -> str | None:
        key = formula_key(formula.skeleton)
        if key not in formulas:
            formulas[key] = {
                "key": key,
                "skeleton": formula.skeleton,
                "category": categorize_formula(formula.skeleton),
                "gloss": None,
            }
        return key

    def add_occurrence(formula_key_: str, c: ClusteredOccurrence) -> str | None:
        occ = c.occurrence
        vowel = segment_vowel_by_ref.get(occ.ref)
        if vowel is None:
            return None
        if occ.ref not in occurrences:
            occurrences[occ.ref] = {
                "formulaKey": formula_key_,
                "ref": occ.ref,
                "tractate": occ.tractate,
                "daf": occ.daf,
                "textVowel": vowel,  # VERBATIM — server re-verifies.
                "textPlain": occ.window_plain,
                "sugyaRef": c.sugya_ref,
                "caseCategory": categorize_case(occ.tractate),
                "slotFillings": _slot_fillings(occ.fillings),
            }
        return occ.ref

    for rp in ranked:
        key = add_formula(rp.formula)
        ref_a = add_occurrence(key, rp.case_a)
        ref_b = add_occurrence(key, rp.case_b)
        if ref_a is None or ref_b is None or key is None:
            continue
        pairs.append(
            {
                "formulaKey": key,
                "caseARef": ref_a,
                "caseBRef": ref_b,
                "distanceDaf": rp.score.distance_daf,
                "outcomeContrast": rp.score.outcome_contrast,
                "contrastNotes": rp.score.contrast_notes,
                "confidence": rp.score.confidence,
            }
        )

    return {
        "formulas": list(formulas.values()),
        "occurrences": list(occurrences.values()),
        "pairs": pairs,
    }


def write_json(payload: dict, path: str) -> None:
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)


def post_to_server(
    payload: dict,
    server: str,
    admin_key: str,
    session: requests.Session | None = None,
) -> dict:
    """POST the import payload to the admin import endpoint."""
    sess = session or requests.Session()
    url = server.rstrip("/") + "/api/admin/import/candidates"
    resp = sess.post(url, json=payload, headers={"x-admin-key": admin_key}, timeout=120)
    resp.raise_for_status()
    return resp.json()
