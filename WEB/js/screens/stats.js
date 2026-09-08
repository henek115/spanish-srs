import { el, openModal } from "../ui.js";
import { buildAchievementContext, getTreeSettings, setTreeSettings, allWords } from "../engine/store.js";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];
const GROWTH_THRESHOLDS = [0, 10, 50, 150, 400, 800];
const TREE_COLORS = ["#3fae6a", "#2e8b57", "#6fae3f", "#22c55e", "#4d8f6b"];
const FRUIT_COLORS = ["#f2b84b", "#fb7185", "#a78bfa", "#60a5fa", "#f472b6"];

function growthStage(wordsLearned) {
  let stage = 0;
  for (let i = 0; i < GROWTH_THRESHOLDS.length; i++) {
    if (wordsLearned >= GROWTH_THRESHOLDS[i]) stage = i;
  }
  return stage;
}

function starPath(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${(cx + Math.cos(angle) * rad).toFixed(1)},${(cy + Math.sin(angle) * rad).toFixed(1)}`);
  }
  return `M${pts.join(" L ")} Z`;
}

function fruitMarkup(shape, x, y, color) {
  if (shape === "star") return `<path d="${starPath(x, y, 4.5)}" fill="${color}"/>`;
  if (shape === "leaf") return `<ellipse cx="${x}" cy="${y}" rx="3.5" ry="5.5" fill="${color}" transform="rotate(45 ${x} ${y})"/>`;
  return `<circle cx="${x}" cy="${y}" r="3.5" fill="${color}"/>`;
}

export function treeSvg(stage, { treeColor, fruitColor, fruitShape }) {
  const growth = stage / (GROWTH_THRESHOLDS.length - 1);
  const trunkH = 18 + growth * 42;
  const trunkW = 7 + growth * 9;
  const canopyR = 16 + growth * 38;
  const baseY = 172;
  const trunkTopY = baseY - trunkH;
  const centerY = trunkTopY + canopyR * 0.85;

  const clusters = [
    { dx: 0, dy: -canopyR * 0.35, r: canopyR * 0.68 },
    { dx: -canopyR * 0.55, dy: 0, r: canopyR * 0.5 },
    { dx: canopyR * 0.55, dy: 0, r: canopyR * 0.5 },
    { dx: -canopyR * 0.3, dy: -canopyR * 0.75, r: canopyR * 0.42 },
    { dx: canopyR * 0.3, dy: -canopyR * 0.75, r: canopyR * 0.42 },
  ];
  const activeClusters = clusters.slice(0, Math.max(1, Math.round(growth * clusters.length) + 1));

  let svg = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<ellipse cx="100" cy="${baseY + 4}" rx="60" ry="6" fill="#060911"/>`;
  if (growth > 0) {
    svg += `<rect x="${100 - trunkW / 2}" y="${trunkTopY}" width="${trunkW}" height="${trunkH}" rx="${trunkW / 3}" fill="#6b4a2f"/>`;
    for (const c of activeClusters) {
      svg += `<circle cx="${100 + c.dx}" cy="${centerY + c.dy}" r="${c.r}" fill="${treeColor}" opacity="0.92"/>`;
    }
    if (stage >= 2) {
      const fruitCount = 3 + stage * 2;
      for (let i = 0; i < fruitCount; i++) {
        const cluster = activeClusters[i % activeClusters.length];
        const angle = (i / fruitCount) * Math.PI * 2 + i;
        const fx = 100 + cluster.dx + Math.cos(angle) * cluster.r * 0.65;
        const fy = centerY + cluster.dy + Math.sin(angle) * cluster.r * 0.65;
        svg += fruitMarkup(fruitShape, fx, fy, fruitColor);
      }
    }
  } else {
    // Росток - самое начало, до первого порога.
    svg += `<path d="M100 ${baseY} Q ${100 - trunkW} ${baseY - 18} 96 ${baseY - 34}" stroke="#4d8f6b" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    svg += `<path d="M100 ${baseY - 6} Q ${100 + trunkW} ${baseY - 20} 106 ${baseY - 32}" stroke="#4d8f6b" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }
  svg += `</svg>`;
  return svg;
}

export function render() {
  const ctx = buildAchievementContext();
  const wordsLearned = ctx.wordsLearned;
  const stage = growthStage(wordsLearned);
  const settings = getTreeSettings();

  const levelBars = el(
    "div",
    { class: "level-bars" },
    LEVELS.map((lvl) => {
      const pct = Math.round(ctx.levelPct[lvl] || 0);
      return el("div", { class: "level-row" }, [
        el("span", { class: "level-name", text: lvl }),
        el("div", { class: "progress-track" }, [el("div", { class: "progress-fill", style: `width:${pct}%` })]),
        el("span", { class: "level-pct", text: `${pct}%` }),
      ]);
    })
  );

  const treeCard = el("div", { class: "card", style: "position:relative;margin-top:1rem" }, [
    el("button", { class: "icon-btn", style: "position:absolute;top:0.75rem;right:0.75rem", onclick: () => openCustomize(rerender) }, [
      customizeIcon(),
    ]),
    el("div", { style: "max-width:220px;margin:0 auto", html: treeSvg(stage, settings) }),
    el("div", { style: "text-align:center;color:var(--text-dim);font-size:0.85rem", text: `Всего изучено: ${wordsLearned} из ${allWords().length}` }),
  ]);

  const body = el("div", {}, [
    el("h2", { text: "Прогресс по уровням", style: "font-size:1rem;margin-bottom:0.75rem" }),
    levelBars,
    treeCard,
  ]);

  function rerender() {
    const fresh = render();
    body.replaceWith(fresh.body);
  }

  return { title: "Прогресс", body, showNav: true };
}

function customizeIcon() {
  const span = el("span", { class: "icon" });
  span.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18"><g fill="none" stroke="var(--text-dim)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 0 0 0 18c1.5 0 2-.9 2-2 0-.6-.3-1-.6-1.4-.3-.4-.5-.7-.5-1.1 0-.8.7-1.5 1.5-1.5H16a3 3 0 0 0 3-3 9 9 0 0 0-7-9Z"/></g></svg>';
  return span;
}

function openCustomize(onSave) {
  const current = getTreeSettings();
  let treeColor = current.treeColor;
  let fruitColor = current.fruitColor;
  let fruitShape = current.fruitShape;

  const preview = el("div", { style: "max-width:160px;margin:0.5rem auto", html: treeSvg(4, current) });

  function refreshPreview() {
    preview.innerHTML = treeSvg(4, { treeColor, fruitColor, fruitShape });
  }

  const treeSwatches = el(
    "div",
    { style: "display:flex;gap:0.5rem;margin:0.5rem 0" },
    TREE_COLORS.map((c) => {
      const dot = el("button", { class: "color-dot" + (c === treeColor ? " selected" : ""), style: `background:${c}` });
      dot.addEventListener("click", () => {
        treeColor = c;
        for (const d of treeSwatches.children) d.classList.remove("selected");
        dot.classList.add("selected");
        refreshPreview();
      });
      return dot;
    })
  );

  const fruitSwatches = el(
    "div",
    { style: "display:flex;gap:0.5rem;margin:0.5rem 0" },
    FRUIT_COLORS.map((c) => {
      const dot = el("button", { class: "color-dot" + (c === fruitColor ? " selected" : ""), style: `background:${c}` });
      dot.addEventListener("click", () => {
        fruitColor = c;
        for (const d of fruitSwatches.children) d.classList.remove("selected");
        dot.classList.add("selected");
        refreshPreview();
      });
      return dot;
    })
  );

  const shapeRow = el(
    "div",
    { style: "display:flex;gap:0.5rem;margin:0.5rem 0" },
    ["circle", "star", "leaf"].map((shape) => {
      const label = { circle: "Круглые", star: "Звёзды", leaf: "Листья" }[shape];
      const btn = el("button", { class: "fruit-choice" + (shape === fruitShape ? " selected" : "") }, [
        el("span", { style: "width:1.1rem;height:1.1rem;display:inline-block", html: `<svg viewBox="0 0 20 20" width="18" height="18">${fruitMarkup(shape, 10, 10, fruitColor)}</svg>` }),
        el("span", { text: label }),
      ]);
      btn.addEventListener("click", () => {
        fruitShape = shape;
        for (const b of shapeRow.children) b.classList.remove("selected");
        btn.classList.add("selected");
        refreshPreview();
      });
      return btn;
    })
  );

  const saveBtn = el("button", { class: "btn btn-primary btn-block", text: "Сохранить", style: "margin-top:0.75rem" });

  const content = el("div", {}, [
    el("div", { class: "modal-header" }, [el("h2", { text: "Настроить дерево" })]),
    preview,
    el("div", { style: "font-size:0.82rem;color:var(--text-dim)", text: "Цвет кроны" }),
    treeSwatches,
    el("div", { style: "font-size:0.82rem;color:var(--text-dim)", text: "Цвет и форма плодов" }),
    fruitSwatches,
    shapeRow,
    saveBtn,
  ]);

  const { close } = openModal(content);
  saveBtn.addEventListener("click", () => {
    setTreeSettings({ treeColor, fruitColor, fruitShape });
    close();
    if (onSave) onSave();
  });
}