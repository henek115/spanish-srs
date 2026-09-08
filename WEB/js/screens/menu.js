import { el, openModal } from "../ui.js";
import { iconEl } from "../icons.js";
import {
  dailyProgressSummary, currentStreakDays, getDailyNewLimit, setDailyNewLimit,
} from "../engine/store.js";

export function render(ctx) {
  const summary = dailyProgressSummary();
  const streak = currentStreakDays();

  const streakBadge = el("div", { class: "pill pill-accent" }, [
    iconEl("flame", { size: 16 }),
    el("span", { text: `${streak} ${daysWord(streak)} подряд` }),
  ]);

  const progressCard = el("div", { class: "card" }, [
    el("div", { style: "display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem" }, [
      el("span", { text: "Новые слова сегодня", style: "color:var(--text-dim);font-size:0.85rem" }),
      el("span", { text: `${summary.newWordsStudied} / ${summary.dailyNewLimit}` }),
    ]),
    el("div", { class: "progress-track" }, [
      el("div", {
        class: "progress-fill",
        style: `width:${Math.min(100, (100 * summary.newWordsStudied) / summary.dailyNewLimit)}%`,
      }),
    ]),
    summary.totalCount
      ? el("div", { style: "margin-top:0.6rem;color:var(--text-dim);font-size:0.85rem", text: `Точность сегодня: ${summary.accuracyPct}%` })
      : null,
  ]);

  const ctaWords = el(
    "button",
    { class: "btn btn-primary btn-block", style: "margin-top:1rem;justify-content:space-between", onclick: () => ctx.navigate("word-review") },
    [
      el("span", {}, [el("div", { text: "Продолжить", style: "font-size:1.05rem" }), el("div", { text: "Слова", style: "font-size:0.78rem;opacity:0.8" })]),
      iconEl("chevron-right", { size: 20, color: "var(--accent-ink)" }),
    ]
  );

  const ctaPhrases = el(
    "button",
    { class: "btn btn-secondary btn-block", style: "margin-top:0.6rem;justify-content:space-between", onclick: () => ctx.navigate("phrase-review") },
    [
      el("span", {}, [el("div", { text: "Фразы", style: "font-size:1.05rem" }), el("div", { text: "Практика выражений", style: "font-size:0.78rem;color:var(--text-dim)" })]),
      iconEl("chat", { size: 20, color: "var(--accent)" }),
    ]
  );

  const topicsBar = el(
    "button",
    { class: "btn btn-secondary btn-block", style: "margin-top:0.6rem;justify-content:flex-start;gap:0.75rem", onclick: () => ctx.navigate("topics") },
    [iconEl("tag", { size: 22, color: "var(--accent)" }), el("span", { text: "Темы и поиск слов" })]
  );

  const body = el("div", {}, [
    el("div", { style: "display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.75rem" }, [
      el("div", {}, [
        el("div", { text: "Привет!", style: "color:var(--text-dim);font-size:0.85rem" }),
        el("h2", { text: "Продолжим учить испанский", style: "font-size:1.2rem;margin-top:0.2rem" }),
      ]),
      streakBadge,
    ]),
    progressCard,
    ctaWords,
    ctaPhrases,
    topicsBar,
  ]);

  return {
    title: "Испанский",
    showNav: true,
    body,
    topbarRight: el("button", { class: "icon-btn", onclick: () => openSettings() }, [iconEl("settings", { size: 18 })]),
  };
}

function daysWord(n) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "дня";
  return "дней";
}

function openSettings() {
  const limit = getDailyNewLimit();
  const valueLabel = el("span", { text: String(limit) });
  const slider = el("input", {
    type: "range", min: "5", max: "20", step: "1", value: String(limit),
    oninput: (e) => { valueLabel.textContent = e.target.value; },
    onchange: (e) => setDailyNewLimit(Number(e.target.value)),
  });

  const content = el("div", {}, [
    el("div", { class: "modal-header" }, [
      el("h2", { text: "Настройки" }),
      el("button", { class: "icon-btn", onclick: () => close() }, [iconEl("close", { size: 16 })]),
    ]),
    el("div", { style: "color:var(--text-dim);font-size:0.85rem;margin-bottom:0.5rem" }, [
      el("span", { text: "Новых слов в день: " }),
      valueLabel,
    ]),
    slider,
  ]);
  const { close } = openModal(content);
}