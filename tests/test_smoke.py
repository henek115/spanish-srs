"""Minimal smoke tests for the backend (no GUI). Run with:
    python -m tests.test_smoke
from the project root, or just `python tests/test_smoke.py`.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import db, importer, deck, srs, matching  # noqa: E402


def test_matching():
    assert matching.check_answer("nino", "niño").correct
    assert matching.check_answer("gracas", "gracias").correct  # 1 typo tolerated
    assert not matching.check_answer("xyz", "gracias").correct
    print("matching: OK")


def test_srs_ramp_and_graduation():
    result = srs.review_card(
        status="неизвестно", interval_stage=0, ease_factor=2.5,
        correct_streak_verify=0, correct=True, is_strict_verify_mode=False,
    )
    assert result.new_status == "в процессе"

    # wrong answer always resets to the first step
    result = srs.review_card(
        status="в процессе", interval_stage=4, ease_factor=2.5,
        correct_streak_verify=0, correct=False, is_strict_verify_mode=False,
    )
    assert result.interval_stage == 0

    # 4 correct verify-mode answers in a row graduate the card
    state = dict(status="требует проверки", interval_stage=6, ease_factor=2.5, correct_streak_verify=0)
    for _ in range(4):
        r = srs.review_card(correct=True, is_strict_verify_mode=True, **state)
        state.update(status=r.new_status, interval_stage=r.interval_stage,
                      ease_factor=r.ease_factor, correct_streak_verify=r.correct_streak_verify)
    assert state["status"] == "изучено"
    print("srs: OK")


def test_import_and_deck(tmp_path=None):
    import tempfile
    tmp_dir = Path(tempfile.mkdtemp())
    conn = db.connect(tmp_dir)
    db.init_db(conn)
    inserted, _ = importer.import_words(conn)
    assert inserted > 3000
    p_inserted, _ = importer.import_phrases(conn)
    assert p_inserted > 0

    deck.set_daily_new_limit(conn, 5)
    seen = 0
    for _ in range(20):
        w = deck.next_word(conn)
        if w is None:
            break
        srs.apply_review(conn, "words", w["id"], correct=True, is_strict_verify_mode=False)
        deck.record_daily_answer(conn, correct=True, is_new_word=True)
        seen += 1
    assert seen == 5, f"expected exactly 5 new words introduced (daily limit), got {seen}"
    conn.close()
    print("import+deck: OK")


if __name__ == "__main__":
    test_matching()
    test_srs_ramp_and_graduation()
    test_import_and_deck()
    print("All smoke tests passed.")
