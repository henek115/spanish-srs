import { el } from "../ui.js";
import { iconEl } from "../icons.js";
import { allAchievementStatus, currentStreakDays } from "../engine/store.js";

export function render() {
  const streak = currentStreakDays();
  const list = allAchievementStatus();
  const earnedCount = list.filter((a) => a.earned).length;

  const streakCard = el("div", { class: "card", style: "display:flex;align-items:center;gap:0.75rem" }, [
    el("div", { style: "width:2.6rem;height:2.6rem;border-radius:50%;background:rgba(242,184,75,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0" }, [
      iconEl("flame", { size: 22, color: "var(--accent)" }),
    ]),
    el("div", {}, [
      el("div", { text: `${streak} дней подряд`, style: "font-weight:600" }),
      el("div", { text: `${earnedCount} из ${list.length} достижений открыто`, style: "color:var(--text-dim);font-size:0.82rem" }),
    ]),
  ]);

  const grid = el(
    "div",
    { class: "badge-grid", style: "margin-top:1rem" },
    list.map((a) =>
      el("div", { class: `badge ${a.earned ? "earned" : "locked"}` }, [
        el("div", { class: "badge-circle" }, [iconEl(a.earned ? "medal" : "lock", { size: 20, color: a.earned ? "var(--accent)" : "var(--text-dim)" })]),
        el("div", { class: "badge-label", text: a.label }),
      ])
    )
  );

  const body = el("div", {}, [streakCard, grid]);
  return { title: "Достижения", body, showNav: true };
}