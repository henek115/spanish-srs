"""Answer checking: typo-tolerant, accent-insensitive comparison.

Rules agreed with the user:
  - Spanish accents (ñ, á, é, í, ó, ú, ¿, ¡) are accepted both with and
    without the accent marks.
  - Small typos are tolerated; the app shows an accuracy percentage rather
    than a flat right/wrong.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher

# A typed answer scoring at or above this similarity counts as "correct".
CORRECT_THRESHOLD = 0.85


def strip_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def normalize(text: str) -> str:
    text = text.strip().lower()
    text = strip_accents(text)
    text = re.sub(r"[¿?¡!.,;:]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()


@dataclass
class MatchResult:
    correct: bool
    accuracy_pct: int
    best_expected: str  # which accepted answer scored highest, for feedback


def check_answer(user_answer: str, expected: str) -> MatchResult:
    """Compare a typed answer against one expected answer (accent-insensitive,
    typo-tolerant). `expected` may contain multiple accepted variants
    separated by ';' or ','.
    """
    variants = [v.strip() for v in re.split(r"[;,]", expected) if v.strip()]
    if not variants:
        variants = [expected]

    user_norm = normalize(user_answer)
    best_ratio = 0.0
    best_variant = variants[0]
    for variant in variants:
        ratio = similarity(user_norm, normalize(variant))
        if ratio > best_ratio:
            best_ratio = ratio
            best_variant = variant

    return MatchResult(
        correct=best_ratio >= CORRECT_THRESHOLD,
        accuracy_pct=round(best_ratio * 100),
        best_expected=best_variant,
    )
