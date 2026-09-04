"""SQLite storage layer for the Spanish SRS app.

Everything the app persists (word deck, phrase deck, review progress,
settings, daily counters) lives in one local SQLite file so the whole
app stays a single-file-database, zero-install desktop tool.
"""
from __future__ import annotations

import sqlite3
from pathlib import Path

DB_FILENAME = "progress.db"

# Statuses a card (word or phrase) moves through, in order:
#   неизвестно        -> imported, never shown to the user yet
#   начато             -> shown for the first time today, first rep not yet correct
#   в процессе         -> at least one correct rep, cycling through the interval ramp
#   требует проверки   -> finished the interval ramp, now needs 4 correct RU->ES
#                         typed answers in a row to graduate
#   изучено            -> graduated (4/4 correct RU->ES verification reps)
STATUSES = ["неизвестно", "начато", "в процессе", "требует проверки", "изучено"]

SCHEMA = """
CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    topic TEXT NOT NULL,
    level TEXT,
    word_es TEXT NOT NULL,
    translation_ru TEXT NOT NULL,
    source TEXT,
    status TEXT NOT NULL DEFAULT 'неизвестно',
    interval_stage INTEGER NOT NULL DEFAULT 0,
    ease_factor REAL NOT NULL DEFAULT 2.5,
    correct_streak_verify INTEGER NOT NULL DEFAULT 0,
    due_at TEXT,
    last_reviewed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(word_es, topic)
);

CREATE INDEX IF NOT EXISTS idx_words_status ON words(status);
CREATE INDEX IF NOT EXISTS idx_words_due ON words(due_at);
CREATE INDEX IF NOT EXISTS idx_words_level ON words(level);
CREATE INDEX IF NOT EXISTS idx_words_topic ON words(category, topic);

CREATE TABLE IF NOT EXISTS phrases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phrase_ru TEXT NOT NULL,
    phrase_es TEXT NOT NULL,
    distractor1 TEXT NOT NULL,
    distractor2 TEXT NOT NULL,
    distractor3 TEXT NOT NULL,
    topic TEXT,
    status TEXT NOT NULL DEFAULT 'неизвестно',
    interval_stage INTEGER NOT NULL DEFAULT 0,
    ease_factor REAL NOT NULL DEFAULT 2.5,
    correct_streak_verify INTEGER NOT NULL DEFAULT 0,
    due_at TEXT,
    last_reviewed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(phrase_ru, phrase_es)
);

CREATE INDEX IF NOT EXISTS idx_phrases_status ON phrases(status);
CREATE INDEX IF NOT EXISTS idx_phrases_due ON phrases(due_at);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_progress (
    date TEXT PRIMARY KEY,
    new_words_studied INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    total_count INTEGER NOT NULL DEFAULT 0
);
"""

DEFAULT_SETTINGS = {
    "daily_new_limit": "10",
}


def get_db_path(base_dir: Path | None = None) -> Path:
    base_dir = base_dir or Path(__file__).resolve().parent.parent
    return base_dir / DB_FILENAME


def connect(base_dir: Path | None = None) -> sqlite3.Connection:
    path = get_db_path(base_dir)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    for key, value in DEFAULT_SETTINGS.items():
        conn.execute(
            "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (key, value)
        )
    conn.commit()


def get_setting(conn: sqlite3.Connection, key: str, default: str | None = None) -> str | None:
    row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    return row["value"] if row else default


def set_setting(conn: sqlite3.Connection, key: str, value: str) -> None:
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (key, value),
    )
    conn.commit()
