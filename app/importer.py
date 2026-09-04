"""Loads the word deck (and phrase deck) CSV files into the SQLite DB.

Safe to run more than once: existing rows (matched by word_es+topic, or
phrase_ru+phrase_es) are left untouched so re-importing never resets
someone's progress.
"""
from __future__ import annotations

import csv
import sqlite3
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
WORDS_CSV = DATA_DIR / "words.csv"
PHRASES_CSV = DATA_DIR / "phrases.csv"


def import_words(conn: sqlite3.Connection, csv_path: Path = WORDS_CSV) -> tuple[int, int]:
    """Returns (inserted, skipped_existing)."""
    inserted = 0
    skipped = 0
    with open(csv_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            word_es = row["word_es"].strip()
            topic = row["topic"].strip()
            if not word_es or not topic:
                continue
            cur = conn.execute(
                "INSERT OR IGNORE INTO words "
                "(category, topic, level, word_es, translation_ru, source) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (
                    row["category"].strip(),
                    topic,
                    (row.get("level") or "").strip() or None,
                    word_es,
                    row["translation_ru"].strip(),
                    (row.get("source") or "").strip() or None,
                ),
            )
            if cur.rowcount:
                inserted += 1
            else:
                skipped += 1
    conn.commit()
    return inserted, skipped


def import_phrases(conn: sqlite3.Connection, csv_path: Path = PHRASES_CSV) -> tuple[int, int]:
    if not csv_path.exists():
        return 0, 0
    inserted = 0
    skipped = 0
    with open(csv_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            phrase_ru = row["phrase_ru"].strip()
            phrase_es = row["phrase_es"].strip()
            if not phrase_ru or not phrase_es:
                continue
            cur = conn.execute(
                "INSERT OR IGNORE INTO phrases "
                "(phrase_ru, phrase_es, distractor1, distractor2, distractor3, topic) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (
                    phrase_ru,
                    phrase_es,
                    row["distractor1"].strip(),
                    row["distractor2"].strip(),
                    row["distractor3"].strip(),
                    (row.get("topic") or "").strip() or None,
                ),
            )
            if cur.rowcount:
                inserted += 1
            else:
                skipped += 1
    conn.commit()
    return inserted, skipped
