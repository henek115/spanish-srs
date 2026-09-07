"""Конвертирует ../data/words.csv и ../data/phrases.csv (та же колода, что
использует Python-версия) в JS-модули для веб-версии. Запускать из WEB:
    python tools/build_data.py
"""
import csv
import json
import pathlib

OUT_DIR = pathlib.Path(__file__).resolve().parent.parent / "data"
OUT_DIR.mkdir(exist_ok=True)

words = []
with open("../data/words.csv", newline="", encoding="utf-8") as f:
    for i, row in enumerate(csv.DictReader(f), start=1):
        words.append({
            "id": i,
            "category": row["category"],
            "topic": row["topic"],
            "level": row["level"] or None,
            "word_es": row["word_es"],
            "translation_ru": row["translation_ru"],
        })

with open(OUT_DIR / "words-data.js", "w", encoding="utf-8") as f:
    f.write("// Автосгенерировано из ../data/words.csv скриптом tools/build_data.py - не редактировать руками.\n")
    f.write("export const WORDS = " + json.dumps(words, ensure_ascii=False, separators=(",", ":")) + ";\n")

phrases = []
with open("../data/phrases.csv", newline="", encoding="utf-8") as f:
    for i, row in enumerate(csv.DictReader(f), start=1):
        phrases.append({
            "id": i,
            "phrase_ru": row["phrase_ru"],
            "phrase_es": row["phrase_es"],
            "distractor1": row["distractor1"],
            "distractor2": row["distractor2"],
            "distractor3": row["distractor3"],
            "topic": row["topic"],
        })

with open(OUT_DIR / "phrases-data.js", "w", encoding="utf-8") as f:
    f.write("// Автосгенерировано из ../data/phrases.csv скриптом tools/build_data.py - не редактировать руками.\n")
    f.write("export const PHRASES = " + json.dumps(phrases, ensure_ascii=False, separators=(",", ":")) + ";\n")

print(f"слов: {len(words)}, фраз: {len(phrases)}")