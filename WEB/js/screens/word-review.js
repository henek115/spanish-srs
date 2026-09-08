import { el } from "../ui.js";
import { nextWord, pickDirection, applyReview, recordDailyAnswer, markLearned, dailyProgressSummary } from "../engine/store.js";
import { checkAnswer } from "../engine/matching.js";

export function render(ctx) {
  const container = el("div", {});
  loadNext(container, ctx);
  return { title: "Слова", showBack: true, body: container, showNav: false };
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
          ? "Дневной лимит новых слов исчерпан. Карточки на повторение появятся, когда подойдёт их время."
          : "Новых слов пока нет и повторять нечего — загляни чуть позже.",
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

  const input = el("input", {
    type: "text",
    placeholder: direction === "ru_to_es" ? "по-испански..." : "по-русски...",
  });
  const feedback = el("div", { style: "min-height:1.6rem;font-size:0.9rem;margin-top:0.5rem" });
  const submitBtn = el("button", { class: "btn btn-primary btn-block", text: "Проверить" });
  const knowBtn = el("button", { class: "btn btn-secondary btn-block", style: "margin-top:0.5rem", text: "Уже знаю" });

  let answered = false;

  function submit() {
    if (answered) {
      loadNext(container, ctx);
      return;
    }
    const value = input.value.trim();
    if (!value) return;
    const result = checkAnswer(value, expected);
    applyReview("words", word.id, { correct: result.correct, isStrictVerifyMode });
    recordDailyAnswer({ correct: result.correct, isNewWord });
    answered = true;
    input.disabled = true;

    feedback.replaceChildren(
      result.correct
        ? el("span", { style: "color:var(--success);font-weight:600", text: `Верно${result.accuracyPct < 100 ? ` (совпадение ${result.accuracyPct}%)` : ""}` })
        : el("div", {}, [
            el("span", { style: "color:var(--danger);font-weight:600", text: "Не совсем." }),
            el("div", { style: "color:var(--text-dim);margin-top:0.2rem", text: `Правильный ответ: ${expected}` }),
          ])
    );
    submitBtn.textContent = "Дальше слово";
    knowBtn.classList.add("hidden");
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
    el("div", { class: "card", style: "margin-top:0.75rem" }, [
      el("div", { style: "font-family:var(--font-heading);font-size:1.6rem;text-align:center;word-break:break-word", text: prompt }),
    ]),
    el("div", { style: "margin-top:1rem" }, [input]),
    feedback,
    el("div", { style: "margin-top:0.75rem" }, [submitBtn, knowBtn])
  );
  input.focus();
}