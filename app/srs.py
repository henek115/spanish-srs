"""Spaced-repetition scheduling.

The rules (agreed with the user):
  - New card ramp: 5-10 min -> 1 hour -> 1 day -> 2-3 days -> 1 week -> 1 month.
    Each correct answer advances one step; the due time becomes now + that step.
  - Any wrong answer sends the card back to the FIRST step (full relearn),
    not just one step back - "слово откатывается назад, пока не закрепится
    текущий уровень интервала".
  - Once a card clears the last step, it leaves the fixed ramp and grows via
    an ease factor (Anki-style): interval *= ease_factor on each further
    correct answer, ease_factor nudged up/down slightly by performance.
  - A word only reaches status "изучено" after 4 CONSECUTIVE correct answers
    in the strict RU->ES typed verification mode specifically (not any mode).
    A wrong answer in that mode resets the streak to 0.
  - Status pipeline: неизвестно -> начато -> в процессе -> требует проверки -> изучено.
"""
from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta

# Fixed ramp for a card still in initial learning ("в процессе").
# Index = interval_stage (0-based). A card that has correctly cleared
# stage N is due after LEARNING_STEPS[N] and, on success, advances to N+1.
LEARNING_STEPS = [
    timedelta(minutes=7),   # ~5-10 minutes
    timedelta(hours=1),
    timedelta(days=1),
    timedelta(days=3),      # 2-3 days
    timedelta(days=7),
    timedelta(days=30),
]

MIN_EASE = 1.3
STARTING_EASE = 2.5
VERIFY_STREAK_TO_GRADUATE = 4


@dataclass
class ReviewResult:
    new_status: str
    due_at: datetime | None
    interval_stage: int
    ease_factor: float
    correct_streak_verify: int


def _now() -> datetime:
    return datetime.now()


def review_card(
    *,
    status: str,
    interval_stage: int,
    ease_factor: float,
    correct_streak_verify: int,
    correct: bool,
    is_strict_verify_mode: bool,
) -> ReviewResult:
    """Compute the next SRS state for one card after one review attempt.

    `is_strict_verify_mode` is True only for the RU->ES typed-answer mode
    used once a card has reached "требует проверки" - that's the only mode
    whose correctness counts toward the 4-in-a-row graduation streak.
    """
    now = _now()
    ease_factor = ease_factor or STARTING_EASE

    if not correct:
        # Any wrong answer: relearn from the first step, and if we were
        # verifying for graduation, that streak is broken.
        new_status = "в процессе" if status != "начато" else "начато"
        return ReviewResult(
            new_status=new_status,
            due_at=now + LEARNING_STEPS[0],
            interval_stage=0,
            ease_factor=max(MIN_EASE, ease_factor - 0.2),
            correct_streak_verify=0,
        )

    # --- correct answer ---
    if status in ("неизвестно", "начато"):
        # First successful rep: enters the learning ramp.
        return ReviewResult(
            new_status="в процессе",
            due_at=now + LEARNING_STEPS[0],
            interval_stage=1,
            ease_factor=ease_factor,
            correct_streak_verify=0,
        )

    if status == "в процессе":
        next_stage = interval_stage + 1
        if next_stage < len(LEARNING_STEPS):
            return ReviewResult(
                new_status="в процессе",
                due_at=now + LEARNING_STEPS[next_stage],
                interval_stage=next_stage,
                ease_factor=ease_factor,
                correct_streak_verify=0,
            )
        # Cleared the whole ramp -> now needs strict RU->ES verification.
        return ReviewResult(
            new_status="требует проверки",
            due_at=now,  # available for a verification rep right away
            interval_stage=next_stage,
            ease_factor=ease_factor,
            correct_streak_verify=0,
        )

    if status == "требует проверки":
        streak = correct_streak_verify + 1 if is_strict_verify_mode else correct_streak_verify
        new_ease = min(3.0, ease_factor + 0.05) if is_strict_verify_mode else ease_factor
        if streak >= VERIFY_STREAK_TO_GRADUATE:
            return ReviewResult(
                new_status="изучено",
                due_at=now + timedelta(days=60),
                interval_stage=interval_stage,
                ease_factor=new_ease,
                correct_streak_verify=streak,
            )
        # Still verifying - re-check again after the same long interval
        # (matches the user's original "...and again, and again" idea for
        # the last ramp step) rather than growing without bound.
        spacing = LEARNING_STEPS[-1]
        return ReviewResult(
            new_status="требует проверки",
            due_at=now + spacing,
            interval_stage=interval_stage,
            ease_factor=new_ease,
            correct_streak_verify=streak,
        )

    if status == "изучено":
        # Long-term maintenance review: grow the interval by the ease factor.
        new_ease = min(3.0, ease_factor + 0.05)
        days = max(30.0, 30.0 * new_ease)
        return ReviewResult(
            new_status="изучено",
            due_at=now + timedelta(days=days),
            interval_stage=interval_stage,
            ease_factor=new_ease,
            correct_streak_verify=correct_streak_verify,
        )

    raise ValueError(f"unknown status: {status!r}")


def apply_review(
    conn: sqlite3.Connection,
    table: str,
    row_id: int,
    *,
    correct: bool,
    is_strict_verify_mode: bool,
) -> ReviewResult:
    """Look up a card's current SRS state, compute the next state, persist it."""
    row = conn.execute(
        f"SELECT status, interval_stage, ease_factor, correct_streak_verify "
        f"FROM {table} WHERE id = ?",
        (row_id,),
    ).fetchone()
    if row is None:
        raise ValueError(f"no row {row_id} in {table}")

    result = review_card(
        status=row["status"],
        interval_stage=row["interval_stage"],
        ease_factor=row["ease_factor"],
        correct_streak_verify=row["correct_streak_verify"],
        correct=correct,
        is_strict_verify_mode=is_strict_verify_mode,
    )

    now_iso = _now().isoformat(timespec="seconds")
    due_iso = result.due_at.isoformat(timespec="seconds") if result.due_at else None
    conn.execute(
        f"UPDATE {table} SET status = ?, interval_stage = ?, ease_factor = ?, "
        f"correct_streak_verify = ?, due_at = ?, last_reviewed_at = ? WHERE id = ?",
        (
            result.new_status,
            result.interval_stage,
            result.ease_factor,
            result.correct_streak_verify,
            due_iso,
            now_iso,
            row_id,
        ),
    )
    conn.commit()
    return result
