"""Phrase review screen: RU phrase shown, pick the right ES translation
out of 4 options."""
from __future__ import annotations

import tkinter as tk
from tkinter import ttk

from app import deck, srs


class PhraseReviewFrame(ttk.Frame):
    def __init__(self, master, conn, on_back):
        super().__init__(master, padding=20)
        self.conn = conn
        self.on_back = on_back
        self.current_phrase = None
        self.option_buttons = []

        self.status_var = tk.StringVar()
        self.prompt_var = tk.StringVar()
        self.feedback_var = tk.StringVar()

        ttk.Label(self, textvariable=self.status_var, font=("Segoe UI", 9, "italic")).pack(anchor="w", pady=(0, 10))
        ttk.Label(self, textvariable=self.prompt_var, font=("Segoe UI", 16, "bold"), wraplength=480, justify="center").pack(pady=(10, 20))

        self.options_frame = ttk.Frame(self)
        self.options_frame.pack(pady=10)

        ttk.Label(self, textvariable=self.feedback_var, font=("Segoe UI", 12)).pack(pady=15)
        ttk.Button(self, text="← Назад в меню", command=self.on_back).pack(side="bottom", anchor="w")

        self.load_next()

    def load_next(self):
        self.feedback_var.set("")
        for b in self.option_buttons:
            b.destroy()
        self.option_buttons = []

        phrase = deck.next_phrase(self.conn)
        if phrase is None:
            self.prompt_var.set("Фразы закончились — добавь новые в data/phrases.csv")
            self.status_var.set("")
            return

        self.current_phrase = phrase
        self.prompt_var.set(phrase["phrase_ru"])
        self.status_var.set(f"Статус: {phrase['status']}")

        options = deck.phrase_options(phrase)
        for opt in options:
            btn = ttk.Button(
                self.options_frame, text=opt, width=45,
                command=lambda o=opt: self.answer(o),
            )
            btn.pack(pady=4)
            self.option_buttons.append(btn)

    def answer(self, chosen: str):
        if self.current_phrase is None:
            return
        correct = chosen.strip() == self.current_phrase["phrase_es"].strip()
        srs.apply_review(
            self.conn, "phrases", self.current_phrase["id"],
            correct=correct, is_strict_verify_mode=False,
        )
        if correct:
            self.feedback_var.set("✓ Верно!")
        else:
            self.feedback_var.set(f"✗ Правильный ответ: {self.current_phrase['phrase_es']}")
        for b in self.option_buttons:
            b.configure(state="disabled")
        self.after(1400, self.load_next)
