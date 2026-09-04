"""Word review screen: typed-answer quiz, RU<->ES, with typo tolerance."""
from __future__ import annotations

import tkinter as tk
from tkinter import ttk

from app import deck, matching, srs


class WordReviewFrame(ttk.Frame):
    def __init__(self, master, conn, on_back):
        super().__init__(master, padding=20)
        self.conn = conn
        self.on_back = on_back
        self.current_word = None
        self.current_direction = None
        self.current_is_verify = False

        self.status_var = tk.StringVar()
        self.prompt_var = tk.StringVar()
        self.feedback_var = tk.StringVar()
        self.progress_var = tk.StringVar()

        ttk.Label(self, textvariable=self.progress_var, font=("Segoe UI", 9)).pack(anchor="w")
        ttk.Label(self, textvariable=self.status_var, font=("Segoe UI", 9, "italic")).pack(anchor="w", pady=(0, 10))

        ttk.Label(self, textvariable=self.prompt_var, font=("Segoe UI", 20, "bold")).pack(pady=(10, 20))

        self.answer_entry = ttk.Entry(self, font=("Segoe UI", 14), width=30)
        self.answer_entry.pack(pady=5)
        self.answer_entry.bind("<Return>", lambda e: self.on_primary_action())

        btn_row = ttk.Frame(self)
        btn_row.pack(pady=10)
        self.check_btn = ttk.Button(btn_row, text="Проверить", command=self.on_primary_action)
        self.check_btn.pack(side="left", padx=5)
        self.check_btn.bind("<Return>", lambda e: self.on_primary_action())
        self.skip_btn = ttk.Button(btn_row, text="Не знаю / пропустить", command=self.skip)
        self.skip_btn.pack(side="left", padx=5)

        ttk.Label(self, textvariable=self.feedback_var, font=("Segoe UI", 12), wraplength=480, justify="center").pack(pady=15)

        ttk.Button(self, text="← Назад в меню", command=self.on_back).pack(side="bottom", anchor="w")

        # True while feedback is on screen and we're waiting for the user to
        # move on themselves (Enter / "Дальше →") instead of auto-advancing -
        # a wrong answer must NOT flash by, there has to be time to read it.
        self.awaiting_continue = False
        self.load_next()

    def load_next(self):
        self.awaiting_continue = False
        self.check_btn.configure(text="Проверить", command=self.on_primary_action)
        self.skip_btn.configure(state="normal")
        self.feedback_var.set("")
        self.answer_entry.delete(0, tk.END)
        summary = deck.daily_progress_summary(self.conn)
        self.progress_var.set(
            f"Сегодня новых слов: {summary['new_words_studied']}/{summary['daily_new_limit']}"
            + (f" · точность за сегодня: {summary['accuracy_pct']}%" if summary["accuracy_pct"] is not None else "")
        )

        word = deck.next_word(self.conn)
        if word is None:
            self.prompt_var.set("На сегодня всё! Новых слов на сегодня больше нет,\nи все повторения выполнены.")
            self.status_var.set("")
            self.answer_entry.configure(state="disabled")
            return

        self.answer_entry.configure(state="normal")
        self.current_word = word
        direction, is_verify = deck.pick_direction(word)
        self.current_direction = direction
        self.current_is_verify = is_verify

        if direction == "ru_to_es":
            self.prompt_var.set(word["translation_ru"])
        else:
            self.prompt_var.set(word["word_es"])

        status_note = f"Статус: {word['status']}"
        if is_verify:
            status_note += "  ·  режим проверки (RU→ES), нужно 4 верных подряд"
        self.status_var.set(status_note)
        self.answer_entry.focus_set()

    def on_primary_action(self):
        """The one button (and Enter key) does double duty: check the answer,
        or - once feedback is showing - move on to the next word."""
        if self.awaiting_continue:
            self.load_next()
        else:
            self.submit()

    def _show_feedback_and_wait(self, *, auto_advance: bool):
        """Freeze the screen on the feedback, and switch the primary button
        into a "Дальше →" continue button. Only a correct answer gets a
        short auto-advance timer - a wrong one waits for the user."""
        self.answer_entry.configure(state="disabled")
        self.skip_btn.configure(state="disabled")
        self.awaiting_continue = True
        self.check_btn.configure(text="Дальше →", command=self.on_primary_action)
        self.check_btn.focus_set()
        if auto_advance:
            self.after(900, self._auto_continue)

    def _auto_continue(self):
        if self.awaiting_continue:
            self.load_next()

    def submit(self):
        if self.current_word is None:
            return
        user_answer = self.answer_entry.get()
        expected = (
            self.current_word["word_es"] if self.current_direction == "ru_to_es"
            else self.current_word["translation_ru"]
        )
        result = matching.check_answer(user_answer, expected)

        srs.apply_review(
            self.conn,
            "words",
            self.current_word["id"],
            correct=result.correct,
            is_strict_verify_mode=self.current_is_verify,
        )
        deck.record_daily_answer(
            self.conn,
            correct=result.correct,
            is_new_word=(self.current_word["status"] == "начато"),
        )

        if result.correct:
            self.feedback_var.set(f"✓ Верно ({result.accuracy_pct}% совпадение)")
        else:
            self.feedback_var.set(
                f"✗ Правильный ответ: {result.best_expected}  (твой ответ совпал на {result.accuracy_pct}%)"
                f"\nНажми Enter или «Дальше», когда посмотришь."
            )
        self._show_feedback_and_wait(auto_advance=result.correct)

    def skip(self):
        if self.current_word is None:
            return
        srs.apply_review(
            self.conn,
            "words",
            self.current_word["id"],
            correct=False,
            is_strict_verify_mode=self.current_is_verify,
        )
        deck.record_daily_answer(self.conn, correct=False, is_new_word=(self.current_word["status"] == "начато"))
        expected = (
            self.current_word["word_es"] if self.current_direction == "ru_to_es"
            else self.current_word["translation_ru"]
        )
        self.feedback_var.set(f"Правильный ответ: {expected}\nНажми Enter или «Дальше», когда посмотришь.")
        self._show_feedback_and_wait(auto_advance=False)
