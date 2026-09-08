import { el } from "../ui.js";

export function render(ctx) {
  const result = ctx.params.result;

  const topicsBlock = (title, topics, color) =>
    topics.length
      ? el("div", { style: "margin-top:0.75rem" }, [
          el("div", { style: `color:${color};font-size:0.85rem;font-weight:600`, text: title }),
          el("div", { style: "color:var(--text-dim);font-size:0.85rem", text: topics.join(", ") }),
        ])
      : null;

  const body = el("div", { class: "card", style: "text-align:center" }, [
    el("div", { style: "color:var(--text-dim);font-size:0.85rem", text: "Твой стартовый уровень" }),
    el("div", { style: "font-family:var(--font-heading);font-size:2.4rem;color:var(--accent);margin:0.25rem 0", text: result.level }),
    el("div", { style: "color:var(--text-dim);font-size:0.9rem", text: `Знакомо примерно ${result.familiarPct}% из ${result.wordCount} слов теста` }),
    el("p", {
      style: "color:var(--text-dim);font-size:0.85rem;margin-top:0.75rem",
      text: `Начнём с повторения ${lowerLevels(result.level)} и будем понемногу добавлять новые слова — это уже учтено в подборе следующих карточек.`,
    }),
    topicsBlock("Сильные темы", result.strongTopics, "var(--success)"),
    topicsBlock("Стоит подтянуть", result.weakTopics, "var(--danger)"),
    el("button", { class: "btn btn-primary btn-block", style: "margin-top:1rem", text: "На главную", onclick: () => ctx.navigate("menu", {}, { replace: true }) }),
    el("button", { class: "btn btn-secondary btn-block", style: "margin-top:0.5rem", text: "Пройти ещё раз", onclick: () => ctx.navigate("placement-quiz", {}, { replace: true }) }),
  ]);

  return { title: "Результат теста", body, showNav: false };
}

function lowerLevels(level) {
  const order = ["A1", "A2", "B1", "B2", "C1"];
  const idx = order.indexOf(level);
  return order.slice(0, idx + 1).join("-");
}