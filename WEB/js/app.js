import { el, mount } from "./ui.js";
import { iconEl } from "./icons.js";
import { flushSave, exportState, importState, onStateChange } from "./engine/store.js";

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
import * as addKnown from "./screens/add-known.js";
import * as mimicryList from "./screens/mimicry-list.js";
import * as mimicryText from "./screens/mimicry-text.js";
import * as account from "./screens/account.js";

window.__store = { exportState, importState, onStateChange, flushSave };

const TABS = [
  { id: "menu", label: "Главная", icon: "home" },
  { id: "placement-intro", label: "Test", icon: "test" },
  { id: "achievements", label: "Достижения", icon: "medal" },
  { id: "stats", label: "Прогресс", icon: "tree" },
  { id: "account", label: "Аккаунт", icon: "user" },
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
  "mimicry-list": mimicryList,
  "mimicry-text": mimicryText,
  "add-known": addKnown,
  account,
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

  root.dataset.section = SECTION_OF[current.name] || "menu";

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

  const innerClasses = ["screen-inner"];
  if (view.wide) innerClasses.push("screen-inner-wide");
  if (view.serif) innerClasses.push("screen-inner-serif");
  if (view.pinkTheme) innerClasses.push("screen-inner-pink");
  if (view.pinkBack) innerClasses.push("screen-inner-pink-back");

  const screenEl = el("div", { class: "screen" }, [
    el("div", { class: innerClasses.join(" ") }, [
      el("div", { class: "topbar" }, topbarChildren),
      el("div", { class: "content" }, [view.body]),
    ]),
  ]);

  const showNav = view.showNav !== false;
  const nav = el(
    "div",
    { class: "side-nav" },
    TABS.map((tab) =>
      el(
        "button",
        {
          class: current.name === tab.id ? "active" : "",
          onclick: () => {
            history = [];
            navigate(tab.id, {}, { replace: true });
            setNavOpen(false);
          },
        },
        [
          el("span", { class: "side-nav-rotor" }, [
            el("span", { class: "side-nav-tag" }),
            el("span", { class: "side-nav-label", text: tab.label }),
          ]),
        ]
      )
    )
  );

  const backdrop = el("div", { class: "nav-backdrop", onclick: () => setNavOpen(false) });
  const toggle = el(
    "button",
    { class: "nav-toggle", onclick: () => setNavOpen(!nav.classList.contains("open")) },
    [iconEl("chevron-right", { size: 16, color: "#3a1418" })]
  );

  function setNavOpen(open) {
    nav.classList.toggle("open", open);
    backdrop.classList.toggle("open", open);
    toggle.classList.toggle("open", open);
  }

  mount(root, nav, backdrop, toggle, screenEl);
}

const SECTION_OF = {
  menu: "home",
  "add-known": "home",
  topics: "home",
  "topic-detail": "home",
  "word-review": "home",
  "phrase-review": "home",
  "mimicry-list": "mimicry",
  "mimicry-text": "mimicry",
  "placement-intro": "placement-intro",
  "placement-quiz": "placement-intro",
  "placement-result": "placement-intro",
  achievements: "achievements",
  stats: "stats",
  account: "account",
};

window.addEventListener("beforeunload", flushSave);
window.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushSave();
});

render();
