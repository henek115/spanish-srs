import { el } from "./ui.js";
import { iconEl } from "./icons.js";
import { setStarred } from "./engine/store.js";

export function wordRow(word, { showCategory = false } = {}) {
  const starIcon = () => iconEl(word.starred ? "star-filled" : "star-outline", { size: 18 });
  const starBtn = el("button", { class: "star-btn" + (word.starred ? " starred" : "") }, [starIcon()]);
  starBtn.addEventListener("click", () => {
    word.starred = !word.starred;
    setStarred(word.id, word.starred);
    starBtn.classList.toggle("starred", word.starred);
    starBtn.replaceChildren(starIcon());
  });

  const wordLine = el("div", { class: "word-es", style: "display:flex;align-items:center;gap:0.35rem" }, [
    el("span", { text: word.word_es }),
  ]);
  if (word.status === "изучено") {
    wordLine.appendChild(iconEl("check-circle", { size: 15, color: "var(--success)" }));
  }

  const subLine = showCategory ? `${word.translation_ru} · ${word.category}` : word.translation_ru;

  return el("div", { class: "word-row" }, [
    starBtn,
    el("div", { class: "word-main" }, [wordLine, el("div", { class: "word-ru", text: subLine })]),
    word.level ? el("span", { class: "level-badge", text: word.level }) : null,
  ]);
}