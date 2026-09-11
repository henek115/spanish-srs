import { el } from "../ui.js";
import { nextWord, pickDirection, applyReview, recordDailyAnswer, markLearned, dailyProgressSummary } from "../engine/store.js";
import { checkAnswer } from "../engine/matching.js";

const AUTO_ADVANCE_CORRECT_MS = 3000;

export function render(ctx) {
  const container = el("div", {});
  loadNext(container, ctx);
  return { title: "Palabras", showBack: true, body: container, showNav: false, pinkTheme: true };
}

function maskedDisplay(expected, typed) {
  let out = "";
  for (let i = 0; i < expected.length; i++) {
    out += i < typed.length ? typed[i] : (expected[i] === " " ? " " : "_");
  }
  return out;
}

function loadNext(container, ctx) {
  const word = nextWord();
  if (!word) {
    renderEmpty(container, ctx);
    return;
  }
  renderCard(container, ctx, word);
}

function renderEmpty(container, ctx) {
  const noNewLeft = dailyProgressSummary().newWordsRemaining <= 0;
  container.replaceChildren(
    el("div", { class: "card" }, [
      el("h2", { text: "На сегодня всё!" }),
      el("p", {
        style: "color:var(--text-dim)",
        text: noNewLeft
          ? "Has alcanzado el límite diario de palabras nuevas."
          : "De momento no hay palabras nuevas ni nada que repasar. Vuelve más tarde.",
      }),
      el("button", { class: "btn btn-primary btn-block", style: "margin-top:0.75rem", onclick: () => ctx.goBack() }, ["На главную"]),
    ])
  );
}

function renderCard(container, ctx, word) {
  const { direction, isStrictVerifyMode } = pickDirection(word);
  const prompt = direction === "ru_to_es" ? word.translation_ru : word.word_es;
  const expected = direction === "ru_to_es" ? word.word_es : word.translation_ru;
  const isNewWord = word.lastReviewedAt == null;

  const input = el("input", { type: "text" });
  const maskEl = el("div", { class: "wr-answer-mask", text: maskedDisplay(expected, "") });
  input.addEventListener("input", () => {
    maskEl.textContent = maskedDisplay(expected, input.value);
  });
  const answerWrap = el("div", { class: "wr-answer-wrap" }, [maskEl, input]);
  const feedback = el("div", { style: "min-height:2.2rem;font-size:0.9rem;margin-top:0.5rem" });
  const submitBtn = el("button", { class: "btn btn-primary btn-block", text: "Comprobar" });
  const knowBtn = el("button", { class: "btn wr-know-btn btn-block", style: "margin-top:0.5rem", text: "Ya lo sé" });

  let answered = false;
  let autoAdvanceTimer = null;

  function submit() {
    if (answered) {
      if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
      loadNext(container, ctx);
      return;
    }
    const value = input.value.trim();
    if (!value) return;
    const result = checkAnswer(value, expected);
    applyReview("words", word.id, { correct: result.correct, isStrictVerifyMode });
    recordDailyAnswer({ correct: result.correct, isNewWord });
    answered = true;
    input.readOnly = true;

    feedback.replaceChildren(
      result.correct
        ? el("div", {}, [
            el("span", { style: "color:var(--success);font-weight:600", text: `¡Correcto!${result.accuracyPct < 100 ? ` (coincidencia del ${result.accuracyPct}%)` : ""}` }),
            result.missingArticle
              ? el("div", { style: "color:var(--text-dim);margin-top:0.2rem", text: "¡No olvides el artículo!" })
              : null,
          ])
        : el("div", {}, [
            el("span", { style: "color:var(--danger);font-weight:600", text: "Не совсем." }),
            el("div", { style: "color:var(--text-dim);margin-top:0.2rem", text: `Правильный ответ: ${expected}` }),
          ])
    );
    submitBtn.textContent = "Siguiente palabra";
    knowBtn.classList.add("hidden");

    if (result.correct) {
      autoAdvanceTimer = setTimeout(() => loadNext(container, ctx), AUTO_ADVANCE_CORRECT_MS);
    }
  }

  submitBtn.addEventListener("click", submit);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  knowBtn.addEventListener("click", () => {
    markLearned("words", word.id);
    recordDailyAnswer({ correct: true, isNewWord });
    loadNext(container, ctx);
  });

  container.replaceChildren(
    el("div", { style: "display:flex;justify-content:space-between;align-items:center" }, [
      el("span", { class: "pill", text: direction === "ru_to_es" ? "RU → ES" : "ES → RU" }),
      word.status === "требует проверки" ? el("span", { class: "pill pill-accent", text: "проверка" }) : null,
    ]),
    el("div", { class: "wr-prompt-card", style: "margin-top:0.75rem" }, [
      el("div", { style: "font-family:var(--font-heading);font-size:1.6rem;text-align:center;word-break:break-word", text: prompt }),
    ]),
    el("div", { style: "margin-top:1rem" }, [answerWrap]),
    feedback,
    el("div", { style: "margin-top:0.75rem" }, [submitBtn, knowBtn])
  );
  input.focus();
}
