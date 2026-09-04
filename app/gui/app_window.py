"""Main window: minimal menu (Этап 1 - functionality first, no icons/theme
yet - that's a later polish pass) to pick a mode, plus a settings dialog
for the daily new-word limit."""
from __future__ import annotations

import tkinter as tk
from tkinter import ttk, simpledialog

from app import deck
from app.gui.word_review import WordReviewFrame
from app.gui.phrase_review import PhraseReviewFrame


class App(tk.Tk):
    def __init__(self, conn):
        super().__init__()
        self.conn = conn
        self.title("Испанский — тренажёр слов и фраз")
        self.geometry("640x520")
        self.minsize(520, 440)

        self.container = ttk.Frame(self)
        self.container.pack(fill="both", expand=True)

        self.show_menu()

    def clear(self):
        for widget in self.container.winfo_children():
            widget.destroy()

    def show_menu(self):
        self.clear()
        frame = ttk.Frame(self.container, padding=30)
        frame.pack(fill="both", expand=True)

        ttk.Label(frame, text="Испанский", font=("Segoe UI", 22, "bold")).pack(pady=(10, 20))

        counts = deck.status_counts(self.conn, "words")
        summary = deck.daily_progress_summary(self.conn)
        stats_text = (
            f"Слов в колоде: неизвестно {counts['неизвестно']} · начато {counts['начато']} · "
            f"в процессе {counts['в процессе']} · требует проверки {counts['требует проверки']} · "
            f"изучено {counts['изучено']}\n"
            f"Сегодня: новых слов {summary['new_words_studied']}/{summary['daily_new_limit']}"
        )
        ttk.Label(frame, text=stats_text, font=("Segoe UI", 9), justify="left", wraplength=560).pack(pady=(0, 20))

        ttk.Button(frame, text="Учить / повторять слова", width=35, command=self.show_words).pack(pady=6)
        ttk.Button(frame, text="Учить / повторять фразы", width=35, command=self.show_phrases).pack(pady=6)
        ttk.Button(frame, text="Настройки (лимит новых слов в день)", width=35, command=self.show_settings).pack(pady=6)

    def show_words(self):
        self.clear()
        WordReviewFrame(self.container, self.conn, on_back=self.show_menu).pack(fill="both", expand=True)

    def show_phrases(self):
        self.clear()
        PhraseReviewFrame(self.container, self.conn, on_back=self.show_menu).pack(fill="both", expand=True)

    def show_settings(self):
        current = deck.get_daily_new_limit(self.conn)
        new_limit = simpledialog.askinteger(
            "Настройки", "Сколько новых слов в день изучать? (5-20)",
            initialvalue=current, minvalue=5, maxvalue=20, parent=self,
        )
        if new_limit is not None:
            deck.set_daily_new_limit(self.conn, new_limit)
        self.show_menu()
