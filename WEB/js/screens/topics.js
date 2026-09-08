import { el } from "../ui.js";
import { iconEl } from "../icons.js";
import { topicsOverview, searchWords } from "../engine/store.js";
import { wordRow } from "../word-row.js";

export function render(ctx) {
  const searchInput = el("input", { type: "search", placeholder: "Поиск слова на любом языке..." });
  const resultsBox = el("div", { class: "hidden" });
  const gridBox = el("div", {});

  buildGrid(gridBox, ctx);

  let debounceTimer = null;
  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const q = searchInput.value.trim();
      if (!q) {
        resultsBox.classList.add("hidden");
        gridBox.classList.remove("hidden");
        return;
      }
      gridBox.classList.add("hidden");
      resultsBox.classList.remove("hidden");
      buildResults(resultsBox, q);
    }, 150);
  });

  const body = el("div", {}, [
    el("div", { style: "margin-bottom:1rem" }, [searchInput]),
    resultsBox,
    gridBox,
  ]);

  return { title: "Темы", showBack: true, body, showNav: false };
}

function buildResults(box, query) {
  const words = searchWords(query, 100);
  if (!words.length) {
    box.replaceChildren(el("div", { style: "color:var(--text-dim);padding:1rem 0", text: "Ничего не нашлось." }));
    return;
  }
  box.replaceChildren(
    el("div", { class: "card" }, words.map((w) => wordRow(w, { showCategory: true })))
  );
}

function buildGrid(box, ctx) {
  const overview = topicsOverview();
  box.replaceChildren(
    el(
      "div",
      { class: "grid-topics" },
      overview.map((topic) => {
        const pct = topic.total ? Math.round((100 * topic.learned) / topic.total) : 0;
        const card = el("button", { class: "topic-card", onclick: () => ctx.navigate("topic-detail", { category: topic.category }) }, [
          el("div", { style: "display:flex;justify-content:space-between;align-items:center" }, [
            iconEl("tag", { size: 18, color: "var(--accent)" }),
            topic.starredCount ? el("span", { class: "pill pill-accent", style: "gap:0.2rem;padding:0.1rem 0.4rem", text: String(topic.starredCount) }) : null,
          ]),
          el("div", { text: topic.category, style: "font-weight:600;font-size:0.9rem" }),
          el("div", { class: "progress-track" }, [el("div", { class: "progress-fill", style: `width:${pct}%` })]),
          el("div", { style: "font-size:0.75rem;color:var(--text-dim)", text: `${topic.learned}/${topic.total} · ${pct}%` }),
        ]);
        return card;
      })
    )
  );
}