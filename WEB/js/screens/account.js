import { el } from "../ui.js";
import { iconEl } from "../icons.js";

const STATUS_LABEL = {
  "signed-out": "",
  syncing: "Синхронизация...",
  synced: "Синхронизировано",
  error: "Ошибка синхронизации",
};

let unsubscribe = null;

export function render() {
  const body = el("div", {}, [renderInner()]);

  if (unsubscribe) unsubscribe();
  unsubscribe = window.AppSync
    ? window.AppSync.onChange(() => {
        const fresh = renderInner();
        body.replaceChild(fresh, body.firstChild);
      })
    : null;

  return { title: "Аккаунт", body, showNav: true };
}

function renderInner() {
  if (!window.AppSync) {
    return el("div", { class: "card" }, [
      el("p", { text: "Синхронизация ещё загружается, подожди пару секунд и обнови страницу." }),
    ]);
  }

  const user = window.AppSync.getUser();
  const status = window.AppSync.getStatus();

  if (!user) {
    return el("div", {}, [
      el("div", { class: "card" }, [
        el("div", { style: "display:flex;justify-content:center;margin-bottom:0.75rem" }, [
          iconEl("cloud", { size: 40 }),
        ]),
        el("p", {
          style: "text-align:center;color:var(--text-dim)",
          text: "Войди через Google, чтобы твой прогресс синхронизировался между устройствами - например, между компьютером и телефоном.",
        }),
        el("button", {
          class: "btn btn-primary btn-block",
          style: "margin-top:0.75rem",
          text: "Войти через Google",
          onclick: () => window.AppSync.signInWithGoogle(),
        }),
      ]),
    ]);
  }

  const rows = [
    el("div", { class: "card", style: "display:flex;align-items:center;gap:0.75rem" }, [
      user.photo
        ? el("img", { src: user.photo, style: "width:48px;height:48px;border-radius:50%" })
        : iconEl("user", { size: 40 }),
      el("div", {}, [
        el("div", { style: "font-weight:600", text: user.name || user.email }),
        el("div", { style: "font-size:0.85rem;color:var(--text-dim)", text: user.email }),
      ]),
    ]),
    el("div", { class: "card", style: "display:flex;align-items:center;gap:0.5rem" }, [
      iconEl(status === "error" ? "x-circle" : "cloud", { size: 20 }),
      el("span", { text: STATUS_LABEL[status] || "" }),
    ]),
  ];

  if (status === "error" && window.AppSync.getLastError()) {
    rows.push(
      el("div", { class: "card", style: "color:var(--danger);font-size:0.85rem" }, [
        el("span", { text: window.AppSync.getLastError() }),
      ])
    );
  }

  rows.push(
    el("button", {
      class: "btn btn-secondary btn-block",
      style: "margin-top:0.5rem",
      text: "Выйти",
      onclick: () => window.AppSync.signOut(),
    })
  );

  return el("div", {}, rows);
}
