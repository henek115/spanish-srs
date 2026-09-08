import { el, mount } from "./ui.js";
import { iconEl } from "./icons.js";
import { flushSave } from "./engine/store.js";

import * as menu from "./screens/menu.js";
import * as wordReview from "./screens/word-review.js";
import * as phraseReview from "./screens/phrase-review.js";
import * as topics from "./screens/topics.js";
import * as topicDetail from "./screens/topic-detail.js";
import * as achievements from "./screens/achievements.js";
import * as stats from "./screens/stats.js";
import * as placementIntro from "./screens/placement-intro.js";
import * as placementQuiz from "./screens/placement-quiz.js";
import * as placementResult from "./screens/placement-result.js";

const TABS = [
  { id: "menu", label: "Главная", icon: "home" },
  { id: "placement-intro", label: "Тест", icon: "test" },
  { id: "achievements", label: "Достижения", icon: "medal" },
  { id: "stats", label: "Прогресс", icon: "tree" },
];

const SCREENS = {
  menu,
  "word-review": wordReview,
  "phrase-review": phraseReview,
  topics,
  "topic-detail": topicDetail,
  achievements,
  stats,
  "placement-intro": placementIntro,
  "placement-quiz": placementQuiz,
  "placement-result": placementResult,
};

const root = document.getElementById("app");
let current = { name: "menu", params: {} };
let history = [];

export function navigate(name, params = {}, { replace = false } = {}) {
  if (!replace) history.push(current);
  current = { name, params };
  render();
}

export function goBack(fallback = "menu") {
  const prev = history.pop();
  current = prev || { name: fallback, params: {} };
  render();
}

function render() {
  window.scrollTo(0, 0);
  const screenModule = SCREENS[current.name];
  if (!screenModule) {
    console.error("unknown screen", current.name);
    return;
  }

  const ctx = { navigate, goBack, params: current.params };
  const view = screenModule.render(ctx);

  const topbarChildren = [];
  if (view.showBack) {
    topbarChildren.push(
      el("button", { class: "icon-btn", onclick: () => (view.onBack ? view.onBack() : goBack()) }, [
        iconEl("back", { size: 20 }),
      ])
    );
  }
  topbarChildren.push(el("h1", { text: view.title || "" }));
  if (view.topbarRight) topbarChildren.push(view.topbarRight);

  const screenEl = el("div", { class: "screen" }, [
    el("div", { class: "topbar" }, topbarChildren),
    el("div", { class: "content" }, [view.body]),
  ]);

  const showNav = view.showNav !== false;
  if (showNav) {
    const nav = el(
      "div",
      { class: "bottom-nav" },
      TABS.map((tab) =>
        el(
          "button",
          {
            class: current.name === tab.id ? "active" : "",
            onclick: () => {
              history = [];
              navigate(tab.id, {}, { replace: true });
            },
          },
          [iconEl(tab.icon, { size: 22 }), el("span", { text: tab.label })]
        )
      )
    );
    screenEl.appendChild(nav);
  }

  mount(root, screenEl);
}

window.addEventListener("beforeunload", flushSave);
window.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushSave();
});

render();