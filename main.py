#!/usr/bin/env python3
"""Entry point: initializes the DB (creating/migrating it if needed),
imports the word/phrase decks if they aren't loaded yet, and launches
the tkinter app.

Run with:  python main.py
Requires only the Python standard library (tkinter + sqlite3 both ship
with a normal Python install on Windows/Mac/Linux).
"""
from __future__ import annotations

from app import db, importer
from app.gui.app_window import App


def main() -> None:
    conn = db.connect()
    db.init_db(conn)

    inserted, skipped = importer.import_words(conn)
    if inserted:
        print(f"Импортировано новых слов: {inserted} (уже было: {skipped})")

    p_inserted, p_skipped = importer.import_phrases(conn)
    if p_inserted:
        print(f"Импортировано новых фраз: {p_inserted} (уже было: {p_skipped})")

    app = App(conn)
    app.mainloop()
    conn.close()


if __name__ == "__main__":
    main()
