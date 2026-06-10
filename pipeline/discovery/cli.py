"""Command-line interface for the discovery pipeline.

Subcommands::

    discover ingest --tractate "Bava Metzia"          # fetch + cache
    discover mine   --tractates "Bava Metzia,Gittin"  # extract + cluster
    discover pairs  --tractates "..." --top 30 --out candidates.json
    discover push   --in candidates.json --server URL --key KEY

``mine`` and ``pairs`` read from the local cache populated by ``ingest`` (so
they run fully offline once tractates are ingested). ``pairs`` builds the
import JSON consumed by ``POST /admin/import/candidates``.
"""

from __future__ import annotations

import argparse
import json
import sys
from typing import Sequence

from .extract import extract_formulas, recurring_formulas
from .output import RankedPair, build_import_payload, post_to_server, write_json
from .score import rank_pairs
from .sefaria import SefariaClient


def _tractate_list(value: str) -> list[str]:
    return [t.strip() for t in value.split(",") if t.strip()]


def _load_segments(client: SefariaClient, tractates: Sequence[str]):
    segments = []
    for tractate in tractates:
        segments.extend(client.get_tractate(tractate))
    return segments


def cmd_ingest(args: argparse.Namespace) -> int:
    client = SefariaClient(sleep_seconds=args.sleep)
    segments = _load_segments(client, [args.tractate])
    print(f"Ingested {len(segments)} segments of {args.tractate} (cached).")
    return 0


def cmd_mine(args: argparse.Namespace) -> int:
    client = SefariaClient(sleep_seconds=args.sleep)
    segments = _load_segments(client, _tractate_list(args.tractates))
    formulas = recurring_formulas(
        extract_formulas(segments), min_occurrences=args.min_occurrences
    )
    print(
        f"Mined {len(formulas)} recurring formulas from {len(segments)} segments "
        f"across {len(_tractate_list(args.tractates))} tractate(s)."
    )
    # top skeletons by occurrence count, for a quick human sanity check
    top = sorted(formulas.values(), key=lambda f: len(f.occurrences), reverse=True)
    for f in top[:15]:
        print(f"  {len(f.occurrences):4d}x  {f.skeleton}")
    return 0


def cmd_pairs(args: argparse.Namespace) -> int:
    client = SefariaClient(sleep_seconds=args.sleep)
    segments = _load_segments(client, _tractate_list(args.tractates))
    vowel_by_ref = {s.ref: s.text_vowel for s in segments}

    formulas = recurring_formulas(
        extract_formulas(segments), min_occurrences=args.min_occurrences
    )
    ranked = rank_pairs(formulas, top_n=args.top, new_word_budget=args.new_word_budget)
    ranked_pairs = [
        RankedPair(formula=f, case_a=a, case_b=b, score=score)
        for (f, a, b, score) in ranked
    ]
    payload = build_import_payload(ranked_pairs, vowel_by_ref)

    write_json(payload, args.out)
    print(
        f"Wrote {len(payload['pairs'])} candidate pairs "
        f"({len(payload['formulas'])} formulas, {len(payload['occurrences'])} occurrences) "
        f"to {args.out}"
    )
    contrast = sum(1 for p in payload["pairs"] if p["outcomeContrast"])
    print(f"  {contrast} flagged as candidate outcome-contrast pairs (heuristic).")
    return 0


def cmd_push(args: argparse.Namespace) -> int:
    with open(args.infile, encoding="utf-8") as fh:
        payload = json.load(fh)
    result = post_to_server(payload, args.server, args.key)
    print("Server import result:")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="discover", description=__doc__)
    parser.add_argument(
        "--sleep", type=float, default=0.6, help="polite delay between live HTTP calls"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_ingest = sub.add_parser("ingest", help="fetch + cache a tractate from Sefaria")
    p_ingest.add_argument("--tractate", required=True)
    p_ingest.set_defaults(func=cmd_ingest)

    p_mine = sub.add_parser("mine", help="extract + cluster formulas")
    p_mine.add_argument("--tractates", required=True, help="comma-separated")
    p_mine.add_argument("--min-occurrences", type=int, default=2, dest="min_occurrences")
    p_mine.set_defaults(func=cmd_mine)

    p_pairs = sub.add_parser("pairs", help="rank candidate pairs -> import JSON")
    p_pairs.add_argument("--tractates", required=True, help="comma-separated")
    p_pairs.add_argument("--top", type=int, default=30)
    p_pairs.add_argument("--min-occurrences", type=int, default=2, dest="min_occurrences")
    p_pairs.add_argument("--new-word-budget", type=int, default=5, dest="new_word_budget")
    p_pairs.add_argument("--out", default="candidates.json")
    p_pairs.set_defaults(func=cmd_pairs)

    p_push = sub.add_parser("push", help="POST candidates to the admin import endpoint")
    p_push.add_argument("--in", dest="infile", default="candidates.json")
    p_push.add_argument("--server", required=True, help="e.g. http://localhost:4000")
    p_push.add_argument("--key", required=True, help="ADMIN_KEY")
    p_push.set_defaults(func=cmd_push)

    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
