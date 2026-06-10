"""Jewoulingo discovery pipeline.

Mines recurring function-word skeletons ("formulas") across the Babylonian
Talmud (William Davidson edition, Aramaic layer, via the Sefaria API),
clusters occurrences, and ranks candidate teachable pairs of occurrences for
human verification.

Hard rules honored throughout this package:

1. All Aramaic text is verbatim Sefaria API text. This package never
   generates, paraphrases, or reconstructs Hebrew/Aramaic passages. The
   vowelized original is stored verbatim alongside a nikud-stripped
   normalized parallel.
2. Everything emitted is a CANDIDATE (``verified=false`` downstream), with
   confidence scores and evidence attached.
"""

__version__ = "0.1.0"
