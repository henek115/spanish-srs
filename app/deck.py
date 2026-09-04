"""Picks what to show next: due reviews first, then new words within the
daily limit, and tracks today's counters."""
from __future__ import annotations

import random
import sqlite3
from datetime import date, datetime
from typing import Optional

from app import db


def _today() -> str:
    return date.today().isoformat()


def ensure_daily_row(conn: sqlite3.Connection) -> None:
    conn.execute(
        "INSERT OR IGNORE INTO daily_progress (date) VALUES (?)", (_today(),)
    )
    conn.commit()


def get_daily_new_limit(conn: sqlite3.Connection) -> int:
    return int(db.get_setting(conn, "daily_new_limit", "10"))


def set_daily_new_limit(conn: sqlite3.Connection, limit: int) -> None:
    limit = max(5, min(20, limit))
    db.set_setting(conn, "daily_new_limit", str(limit))


def new_words_studied_today(conn: sqlite3.Connection) -> int:
    ensure_daily_row(conn)
    row = conn.execute(
        "SELECT new_words_studied FROM daily_progress WHERE date = ?", (_today(),)
    ).fetchone()
    return row["new_words_studied"] if row else 0


def record_daily_answer(conn: sqlite3.Connection, *, correct: bool, is_new_word: bool) -> None:
    ensure_daily_row(conn)
    conn.execute(
        "UPDATE daily_progress SET "
        "correct_count = correct_count + ?, "
        "total_count = total_count + 1, "
        "new_words_studied = new_words_studied + ? "
        "WHERE date = ?",
        (1 if correct else 0, 1 if is_new_word else 0, _today()),
    )
    conn.commit()


def daily_progress_summary(conn: sqlite3.Connection) -> dict:
    ensure_daily_row(conn)
    row = conn.execute(
        "SELECT new_words_studied, correct_count, total_count FROM daily_progress WHERE date = ?",
        (_today(),),
    ).fetchone()
    limit = get_daily_new_limit(conn)
    pct = round(100 * row["correct_count"] / row["total_count"]) if row["total_count"] else None
    return {
        "new_words_studied": row["new_words_studied"],
        "daily_new_limit": limit,
        "new_words_remaining": max(0, limit - row["new_words_studied"]),
        "correct_count": row["correct_count"],
        "total_count": row["total_count"],
        "accuracy_pct": pct,
    }


def next_word(conn: sqlite3.Connection) -> Optional[sqlite3.Row]:
    """Pick the next word card to review: a due card first, otherwise a new
    one (if today's new-word limit hasn't been reached).
    """
    now_iso = datetime.now().isoformat(timespec="seconds")

    due = conn.execute(
        "SELECT * FROM words WHERE status IN ('начато','в процессе','требует проверки','изучено') "
        "AND due_at IS NOT NULL AND due_at <= ? ORDER BY due_at ASC LIMIT 1",
        (now_iso,),
    ).fetchone()
    if due is not None:
        return due

    if new_words_studied_today(conn) < get_daily_new_limit(conn):
        candidate = conn.execute(
            "SELECT * FROM words WHERE status = 'неизвестно' ORDER BY RANDOM() LIMIT 1"
        ).fetchone()
        if candidate is not None:
            conn.execute(
                "UPDATE words SET status = 'начато', due_at = ? WHERE id = ?",
                (now_iso, candidate["id"]),
            )
            conn.commit()
            return conn.execute("SELECT * FROM words WHERE id = ?", (candidate["id"],)).fetchone()

    return None


def pick_direction(word_row: sqlite3.Row) -> tuple[str, bool]:
    """Returns (direction, is_strict_verify_mode).
    direction is 'ru_to_es' or 'es_to_ru'.
    """
    if word_row["status"] == "требует проверки":
        return "ru_to_es", True
    return random.choice(["ru_to_es", "es_to_ru"]), False


def next_phrase(conn: sqlite3.Connection) -> Optional[sqlite3.Row]:
    now_iso = datetime.now().isoformat(timespec="seconds")
    due = conn.execute(
        "SELECT * FROM phrases WHERE status IN ('начато','в процессе','требует проверки','изучено') "
        "AND due_at IS NOT NULL AND due_at <= ? ORDER BY due_at ASC LIMIT 1",
        (now_iso,),
    ).fetchone()
    if due is not None:
        return due

    candidate = conn.execute(
        "SELECT * FROM phrases WHERE status = 'неизвестно' ORDER BY RANDOM() LIMIT 1"
    ).fetchone()
    if candidate is not None:
        conn.execute(
            "UPDATE phrases SET status = 'начато', due_at = ? WHERE id = ?",
            (now_iso, candidate["id"]),
        )
        conn.commit()
        return conn.execute("SELECT * FROM phrases WHERE id = ?", (candidate["id"],)).fetchone()
    return None


def phrase_options(phrase_row: sqlite3.Row) -> list[str]:
    options = [
        phrase_row["phrase_es"],
        phrase_row["distractor1"],
        phrase_row["distractor2"],
        phrase_row["distractor3"],
    ]
    random.shuffle(options)
    return options


def status_counts(conn: sqlite3.Connection, table: str) -> dict:
    rows = conn.execute(f"SELECT status, COUNT(*) as n FROM {table} GROUP BY status").fetchall()
    counts = {s: 0 for s in db.STATUSES}
    for r in rows:
        counts[r["status"]] = r["n"]
    return counts
