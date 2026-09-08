import { el } from "../ui.js";
import { iconEl } from "../icons.js";
import { getPlacementInfo } from "../engine/store.js";
import { fmtDate } from "../ui.js";

export function render(ctx) {
  const info = getPlacementInfo();

  const body = el("div", { class: "card", style: "text-align:center" }, [
    el("div", { style: "width:3.5rem;height:3.5rem;border-radius:50%;background:rgba(242,184,75,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 0.75rem" }, [
      iconEl("test", { size: 28, color: "var(--accent)" }),
    ]),
    el("h2", { text: "Тест на уровень", style: "font-size:1.1rem" }),
    el("p", {
      style: "color:var(--text-dim);margin:0.5rem 0 1rem;font-size:0.9rem",
      text: "Короткий тест по словам разных тем и уровней (A1-C1). По каждому слову — ползунок от «совсем не знаю» до «легко». В конце покажем стартовый уровень, сильные и слабые темы, и с чего начать. Результат реально влияет на то, какие новые слова будут предлагаться дальше.",
    }),
    info.level
      ? el("div", { class: "pill pill-accent", style: "margin-bottom:1rem", text: `Прошлый результат: ${info.level} · ${fmtDate(info.completedAt)}` })
      : null,
    el("button", { class: "btn btn-primary btn-block", text: "Начать тест", onclick: () => ctx.navigate("placement-quiz") }),
  ]);

  return { title: "Тест на уровень", body, showNav: true };
}