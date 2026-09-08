import { el } from "../ui.js";
import { buildPool, computeResult } from "../engine/placement.js";
import { allWords, savePlacementResult } from "../engine/store.js";

const AUTO_ADVANCE_MS = 550;

export function render(ctx) {
  const pool = buildPool(allWords());
  const answers = [];
  let index = 0;
  let pendingTimer = null;

  const container = el("div", {});

  function showQuestion() {
    if (index >= pool.length) {
      const result = computeResult(answers);
      savePlacementResult(result);
      ctx.navigate("placement-result", { result }, { replace: true });
      return;
    }

    const word = pool[index];
    const slider = el("input", { type: "range", min: "0", max: "100", value: "50" });
    const sliderLabel = el("div", { style: "text-align:center;color:var(--text-dim);font-size:0.85rem;margin:0.5rem 0" });

    function updateLabel(v) {
      let text = "не уверен(а)";
      if (v < 20) text = "совсем не знаю";
      else if (v < 45) text = "смутно знакомо";
      else if (v < 70) text = "узнаю, но не уверен(а)";
      else if (v < 90) text = "знаю хорошо";
      else text = "легко";
      sliderLabel.textContent = text;
    }
    updateLabel(50);
    slider.addEventListener("input", () => updateLabel(Number(slider.value)));

    function commit() {
      if (pendingTimer) clearTimeout(pendingTimer);
      answers.push({ wordId: word.id, category: word.category, level: word.level, score: Number(slider.value) });
      index += 1;
      showQuestion();
    }

    slider.addEventListener("change", () => {
      if (pendingTimer) clearTimeout(pendingTimer);
      pendingTimer = setTimeout(commit, AUTO_ADVANCE_MS);
    });

    const nextBtn = el("button", { class: "btn btn-primary btn-block", text: index + 1 < pool.length ? "Дальше" : "Завершить", style: "margin-top:1rem", onclick: commit });

    const long = word.word_es.length > 22;

    container.replaceChildren(
      el("div", { style: "color:var(--text-dim);font-size:0.8rem;text-align:center", text: `${index + 1} / ${pool.length} · ${word.category}` }),
      el("div", { class: "progress-track", style: "margin:0.5rem 0 1rem" }, [
        el("div", { class: "progress-fill", style: `width:${(100 * index) / pool.length}%` }),
      ]),
      el("div", { class: "card" }, [
        el("div", {
          style: `font-family:var(--font-heading);text-align:center;word-break:break-word;font-size:${long ? "1.15rem" : "1.4rem"}`,
          text: word.word_es,
        }),
        el("div", { style: "text-align:center;color:var(--text-dim);margin-top:0.3rem", text: word.translation_ru }),
      ]),
      el("div", { style: "margin-top:1rem" }, [slider]),
      sliderLabel,
      nextBtn
    );
  }

  showQuestion();
  return { title: "Тест на уровень", showBack: true, body: container, showNav: false };
}