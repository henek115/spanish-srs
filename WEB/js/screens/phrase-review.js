import { el } from "../ui.js";
import { nextPhrase, applyReview, phraseOptions } from "../engine/store.js";

export function render(ctx) {
  const container = el("div", {});
  loadNext(container, ctx);
  return { title: "Фразы", showBack: true, body: container, showNav: false };
}

function loadNext(container, ctx) {
  const phrase = nextPhrase();
  if (!phrase) {
    container.replaceChildren(
      el("div", { class: "card" }, [
        el("h2", { text: "Фразы закончились!" }),
        el("p", { style: "color:var(--text-dim)", text: "Все фразы из колоды сейчас либо изучены, либо ждут своего срока повторения." }),
        el("button", { class: "btn btn-primary btn-block", style: "margin-top:0.75rem", onclick: () => ctx.goBack() }, ["На главную"]),
      ])
    );
    return;
  }
  renderCard(container, ctx, phrase);
}

function renderCard(container, ctx, phrase) {
  const isStrictVerifyMode = phrase.status === "требует проверки";
  const options = phraseOptions(phrase);
  const feedback = el("div", { style: "min-height:1.6rem;font-size:0.9rem;margin-top:0.75rem" });
  const optionButtons = [];
  let answered = false;

  function choose(value, btn) {
    if (answered) return;
    answered = true;
    const correct = value === phrase.phrase_es;
    applyReview("phrases", phrase.id, { correct, isStrictVerifyMode });

    for (const b of optionButtons) {
      b.disabled = true;
      if (b._value === phrase.phrase_es) b.style.borderColor = "var(--success)";
    }
    btn.style.borderColor = correct ? "var(--success)" : "var(--danger)";

    feedback.replaceChildren(
      correct
        ? el("span", { style: "color:var(--success);font-weight:600", text: "Верно!" })
        : el("div", {}, [
            el("span", { style: "color:var(--danger);font-weight:600", text: "Не то." }),
            el("div", { style: "color:var(--text-dim);margin-top:0.2rem", text: `Правильно: ${phrase.phrase_es}` }),
          ])
    );

    const nextBtn = el("button", { class: "btn btn-primary btn-block", style: "margin-top:0.75rem", text: "Дальше фраза", onclick: () => loadNext(container, ctx) });
    feedback.appendChild(nextBtn);
  }

  for (const opt of options) {
    const btn = el("button", {
      class: "btn btn-secondary btn-block",
      style: "margin-top:0.5rem;text-align:left;justify-content:flex-start",
      text: opt,
    });
    btn._value = opt;
    btn.addEventListener("click", () => choose(opt, btn));
    optionButtons.push(btn);
  }

  container.replaceChildren(
    isStrictVerifyMode ? el("span", { class: "pill pill-accent", text: "проверка" }) : null,
    el("div", { class: "card", style: "margin-top:0.5rem" }, [
      el("div", { style: "font-family:var(--font-heading);font-size:1.3rem;text-align:center", text: phrase.phrase_ru }),
    ]),
    el("div", { style: "margin-top:0.75rem" }, optionButtons),
    feedback
  );
}