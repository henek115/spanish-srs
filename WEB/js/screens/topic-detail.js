import { el } from "../ui.js";
import { wordsInCategory } from "../engine/store.js";
import { wordRow } from "../word-row.js";

export function render(ctx) {
  const category = ctx.params.category;
  const words = wordsInCategory(category);
  const body = el("div", { class: "card" }, words.map((w) => wordRow(w)));

  return { title: category, showBack: true, body, showNav: false };
}