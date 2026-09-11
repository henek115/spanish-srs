import { WORDS } from "../../data/words-data.js";
import { PHRASES } from "../../data/phrases-data.js";
import { reviewCard, STARTING_EASE } from "./srs.js";
import { CATALOG } from "./achievements.js";
import { normalize } from "./matching.js";
import { verbsInText } from "./mimicry.js";
import { TEXTS } from "../../data/texts-data.js";
import { WORD_LEVEL_BY_LEMMA } from "../../data/word-frequency-data.js";
import { CUSTOM_WORD_CATEGORY } from "../categories.js";

const LS_KEY = "spanish-srs-progress-v1";
const LEVEL_ORDER = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4 };
const DUE_STATUSES = ["начато", "в процессе", "требует проверки", "изучено"];
export const STATUSES = ["неизвестно", "начато", "в процессе", "требует проверки", "изучено"];

// ALL_WORDS/ALL_PHRASES = встроенная колода (WORDS/PHRASES из data/) + слова
// и фразы, добавленные пользователем вручную (state.customWords/customPhrases,
// см. addCustomWords/addCustomPhrases ниже). Везде по файлу, где раньше было
// обращение напрямую к WORDS/PHRASES, теперь ALL_WORDS/ALL_PHRASES - чтобы
// добавленные слова сразу участвовали в подборе карточек, поиске, темах и т.д.
let ALL_WORDS = WORDS;
let ALL_PHRASES = PHRASES;
let WORDS_BY_ID = new Map(ALL_WORDS.map((w) => [w.id, w]));
let PHRASES_BY_ID = new Map(ALL_PHRASES.map((p) => [p.id, p]));
let wordEsIndex = null; // кэш для поиска глаголов "Имитации" - объявлен здесь, а не ниже, потому что rebuildWordPool() (вызывается сразу же) уже обращается к нему

function today() {
  return new Date().toISOString().slice(0, 10);
}

function defaultProgress() {
  return {
    words: {},
    phrases: {},
    customWords: [],
    customPhrases: [],
    customIdSeq: 0,
    settings: {
      dailyNewLimit: 10,
      treeColor: "#3fae6a",
      fruitColor: "#f2b84b",
      fruitShape: "circle",
      placementLevel: "",
      placementCompletedAt: "",
    },
    dailyProgress: {},
    earnedAchievements: [],
    // Метка времени последнего реального изменения - используется облачной
    // синхронизацией (см. firebase-bridge.js), чтобы решать, какая версия
    // прогресса новее (это устройство или облако) при входе в аккаунт.
    // 0 у пустого/нового профиля - значит настоящие данные из облака всегда
    // "новее" пустого устройства и подтягиваются без вопросов.
    updatedAt: 0,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw);
    const d = defaultProgress();
    return {
      ...d,
      ...parsed,
      settings: { ...d.settings, ...(parsed.settings || {}) },
      customWords: parsed.customWords || [],
      customPhrases: parsed.customPhrases || [],
    };
  } catch (e) {
    console.warn("не удалось прочитать сохранённый прогресс, начинаю заново", e);
    return defaultProgress();
  }
}

let state = loadState();
let saveTimer = null;

// --- подписка на изменения (для облачной синхронизации) --------------------
// firebase-bridge.js (отдельный модуль, не через esbuild-бандл) подписывается
// сюда, чтобы узнавать о каждом реальном изменении прогресса и решать, нужно
// ли что-то отправить в облако. store.js ничего не знает про Firebase - это
// сделано специально, чтобы движок оставался независимым и тестируемым.
let changeListeners = [];
export function onStateChange(fn) {
  changeListeners.push(fn);
  return () => {
    changeListeners = changeListeners.filter((f) => f !== fn);
  };
}
function notifyChange() {
  for (const fn of changeListeners) {
    try {
      fn();
    } catch (e) {
      console.warn("слушатель onStateChange упал", e);
    }
  }
}

// --- добавленные пользователем слова/фразы ---------------------------------

function rebuildWordPool() {
  ALL_WORDS = WORDS.concat(state.customWords);
  WORDS_BY_ID = new Map(ALL_WORDS.map((w) => [w.id, w]));
  wordEsIndex = null; // кэш поиска глаголов для "Имитации" - сбрасываем, вдруг там теперь есть новые слова
}
function rebuildPhrasePool() {
  ALL_PHRASES = PHRASES.concat(state.customPhrases);
  PHRASES_BY_ID = new Map(ALL_PHRASES.map((p) => [p.id, p]));
}
rebuildWordPool();
rebuildPhrasePool();

function nextCustomId(prefix) {
  state.customIdSeq = (state.customIdSeq || 0) + 1;
  return `${prefix}-${state.customIdSeq}`;
}

// --- автоопределение уровня и темы для слов, добавленных вручную ----------
//
// Уровень: приблизительно, по частоте слова в реальных испанских текстах
// (WORD_LEVEL_BY_LEMMA - см. data/word-frequency-data.js). Не настоящий
// CEFR-словарь (такого бесплатного нет), просто чем чаще слово встречается,
// тем ниже уровень. Работает только для одиночных слов в словарной форме -
// спряжённая форма глагола или фраза просто не найдётся в списке, и уровень
// останется пустым, как раньше.
//
// Тема: без нейросетей/embeddings (это тяжело для лёгкого офлайн-приложения -
// см. обсуждение) - вместо этого сравниваем слова в переводе нового слова со
// словами в переводах уже встроенных слов по темам. Тема, слова которой
// чаще всего встречаются в переводе нового слова, и побеждает. Если ничего
// не совпало - слово остаётся в "Мои слова", как раньше.

function tokenizeTranslation(text) {
  return (text.toLowerCase().match(/[a-zа-яёñáéíóúü]+/gi) || []).filter((t) => t.length > 2);
}

let translationCategoryIndex = null; // token -> Map(category -> count)

function buildTranslationCategoryIndex() {
  translationCategoryIndex = new Map();
  // Намеренно WORDS (встроенная колода), а не ALL_WORDS - иначе один раз
  // угаданная (возможно неверно) тема начала бы усиливать сама себя.
  for (const w of WORDS) {
    const text = wordTranslation(w);
    if (!text) continue;
    for (const tok of tokenizeTranslation(text)) {
      let byCat = translationCategoryIndex.get(tok);
      if (!byCat) {
        byCat = new Map();
        translationCategoryIndex.set(tok, byCat);
      }
      byCat.set(w.category, (byCat.get(w.category) || 0) + 1);
    }
  }
}

export function guessCategoryForTranslation(text) {
  if (!translationCategoryIndex) buildTranslationCategoryIndex();
  const scores = new Map();
  for (const tok of tokenizeTranslation(text || "")) {
    const byCat = translationCategoryIndex.get(tok);
    if (!byCat) continue;
    for (const [cat, count] of byCat) scores.set(cat, (scores.get(cat) || 0) + count);
  }
  let best = null;
  let bestScore = 0;
  for (const [cat, score] of scores) {
    if (score > bestScore) {
      best = cat;
      bestScore = score;
    }
  }
  return best;
}

function guessLevelForWord(wordEs) {
  return WORD_LEVEL_BY_LEMMA[wordEs.trim().toLowerCase()] || "";
}

// lang: "ru" | "en" - на каком языке translation в этих rows. Слово всегда
// хранит оба поля (translation_ru/translation_en), но заполняется только
// то, что реально ввели - второе остаётся пустой строкой. wordTranslation()
// ниже сама выбирает, какое из них показывать, так что весь остальной код
// (поиск, экран повторения, карточки) не хардкодит русский.
export function addCustomWords(rows, lang = "ru") {
  const created = [];
  for (const { word_es, translation } of rows || []) {
    const es = (word_es || "").trim();
    const tr = (translation || "").trim();
    if (!es || !tr) continue;
    const row = {
      id: nextCustomId("w"),
      word_es: es,
      translation_ru: lang === "ru" ? tr : "",
      translation_en: lang === "en" ? tr : "",
      category: guessCategoryForTranslation(tr) || CUSTOM_WORD_CATEGORY,
      level: guessLevelForWord(es),
    };
    state.customWords.push(row);
    created.push(row);
  }
  if (created.length) {
    rebuildWordPool();
    save();
  }
  return created.map((r) => getWord(r.id));
}

// Достаёт перевод слова независимо от того, на русском он или на английском
// - именно эта функция решает, какое поле показать, вместо того чтобы
// каждый экран сам лез в translation_ru.
export function wordTranslation(word) {
  return word.translation_ru || word.translation_en || "";
}
export function wordTranslationLang(word) {
  if (word.translation_ru) return "ru";
  if (word.translation_en) return "en";
  return "ru";
}
export function phraseTranslation(phrase) {
  return phrase.phrase_ru || phrase.phrase_en || "";
}

function pickDistractors(excludeEs, count = 3) {
  const pool = ALL_PHRASES.filter((p) => p.phrase_es !== excludeEs).map((p) => p.phrase_es);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export function addCustomPhrases(rows, lang = "ru") {
  const created = [];
  for (const { phrase_es, translation } of rows || []) {
    const es = (phrase_es || "").trim();
    const tr = (translation || "").trim();
    if (!es || !tr) continue;
    const [d1, d2, d3] = pickDistractors(es);
    const row = {
      id: nextCustomId("p"),
      phrase_es: es,
      phrase_ru: lang === "ru" ? tr : "",
      phrase_en: lang === "en" ? tr : "",
      distractor1: d1 || es,
      distractor2: d2 || es,
      distractor3: d3 || es,
    };
    state.customPhrases.push(row);
    created.push(row);
  }
  if (created.length) {
    rebuildPhrasePool();
    save();
  }
  return created.map((r) => getPhrase(r.id));
}

function save() {
  state.updatedAt = Date.now();
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("не удалось сохранить прогресс", e);
    }
    notifyChange();
  }, 50);
}

export function flushSave() {
  if (saveTimer) clearTimeout(saveTimer);
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("не удалось сохранить прогресс", e);
  }
  notifyChange();
}

// --- экспорт/импорт всего прогресса (для облачной синхронизации) -----------

// Возвращает независимую копию всего прогресса - ровно то, что лежит в
// localStorage под LS_KEY. Именно этот объект целиком улетает в Firestore.
export function exportState() {
  return JSON.parse(JSON.stringify(state));
}

// Полностью заменяет текущий прогресс присланным (из облака). Используется
// только синхронизацией - НЕ бьёт state.updatedAt заново (сохраняет значение
// из присланных данных), чтобы не создавать иллюзию, будто локальные данные
// только что изменились.
export function importState(newState) {
  const d = defaultProgress();
  state = {
    ...d,
    ...newState,
    settings: { ...d.settings, ...((newState && newState.settings) || {}) },
    customWords: (newState && newState.customWords) || [],
    customPhrases: (newState && newState.customPhrases) || [],
  };
  rebuildWordPool();
  rebuildPhrasePool();
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("не удалось сохранить прогресс после синхронизации", e);
  }
  notifyChange();
}

function blankCardProgress() {
  return {
    status: "неизвестно",
    intervalStage: 0,
    easeFactor: STARTING_EASE,
    correctStreakVerify: 0,
    dueAt: null,
    lastReviewedAt: null,
    starred: false,
  };
}

function wordProgress(id) {
  return (state.words[id] ||= blankCardProgress());
}
function phraseProgress(id) {
  return (state.phrases[id] ||= blankCardProgress());
}

function withProgress(staticRow, progress) {
  return { ...staticRow, ...progress };
}

export function getWord(id) {
  const w = WORDS_BY_ID.get(id);
  return w ? withProgress(w, wordProgress(id)) : null;
}
export function getPhrase(id) {
  const p = PHRASES_BY_ID.get(id);
  return p ? withProgress(p, phraseProgress(id)) : null;
}

// --- дневной лимит / счётчики дня -----------------------------------------

function ensureDailyRow(date) {
  return (state.dailyProgress[date] ||= { newWordsStudied: 0, correctCount: 0, totalCount: 0 });
}

export function getDailyNewLimit() {
  return state.settings.dailyNewLimit;
}
export function setDailyNewLimit(limit) {
  state.settings.dailyNewLimit = Math.max(5, Math.min(20, limit));
  save();
}
export function newWordsStudiedToday() {
  return ensureDailyRow(today()).newWordsStudied;
}
export function recordDailyAnswer({ correct, isNewWord }) {
  const row = ensureDailyRow(today());
  row.totalCount += 1;
  if (correct) row.correctCount += 1;
  if (isNewWord) row.newWordsStudied += 1;
  save();
}
export function dailyProgressSummary() {
  const row = ensureDailyRow(today());
  const limit = getDailyNewLimit();
  const pct = row.totalCount ? Math.round((100 * row.correctCount) / row.totalCount) : null;
  return {
    newWordsStudied: row.newWordsStudied,
    dailyNewLimit: limit,
    newWordsRemaining: Math.max(0, limit - row.newWordsStudied),
    correctCount: row.correctCount,
    totalCount: row.totalCount,
    accuracyPct: pct,
  };
}

export function todayGoalOverview() {
  const now = Date.now();
  let dueCount = 0;
  for (const w of ALL_WORDS) {
    const p = wordProgress(w.id);
    if (DUE_STATUSES.includes(p.status) && p.dueAt != null && p.dueAt <= now) dueCount += 1;
  }
  const summary = dailyProgressSummary();
  const total = dueCount + summary.newWordsRemaining;
  const done = Math.min(summary.totalCount, total);
  return { total, done, remaining: Math.max(0, total - done) };
}

// --- подбор следующего слова -----------------------------------------------

function cmpKey(a, b) {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0, bv = b[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

function pickNewWord() {
  const candidates = ALL_WORDS.filter((w) => wordProgress(w.id).status === "неизвестно");
  if (!candidates.length) return null;

  const placementIdx = LEVEL_ORDER[state.settings.placementLevel];
  const keyOf = (w) => {
    const starred = wordProgress(w.id).starred ? 0 : 1;
    if (placementIdx === undefined) return [starred];
    const lvl = LEVEL_ORDER[w.level] ?? 99;
    const tier = lvl <= placementIdx ? 0 : 1;
    return [starred, tier, lvl];
  };

  let bestKey = null;
  let bucket = [];
  for (const w of candidates) {
    const k = keyOf(w);
    const cmp = bestKey === null ? -1 : cmpKey(k, bestKey);
    if (cmp < 0) {
      bestKey = k;
      bucket = [w];
    } else if (cmp === 0) {
      bucket.push(w);
    }
  }
  return bucket[Math.floor(Math.random() * bucket.length)];
}

export function nextWord() {
  const now = Date.now();
  let due = null;
  let dueAt = Infinity;
  for (const w of ALL_WORDS) {
    const p = wordProgress(w.id);
    if (DUE_STATUSES.includes(p.status) && p.dueAt != null && p.dueAt <= now && p.dueAt < dueAt) {
      due = w;
      dueAt = p.dueAt;
    }
  }
  if (due) return getWord(due.id);

  if (newWordsStudiedToday() < getDailyNewLimit()) {
    const candidate = pickNewWord();
    if (candidate) {
      const p = wordProgress(candidate.id);
      p.status = "начато";
      p.dueAt = now;
      save();
      return getWord(candidate.id);
    }
  }
  return null;
}

export function nextPhrase() {
  const now = Date.now();
  let due = null;
  let dueAt = Infinity;
  for (const ph of ALL_PHRASES) {
    const p = phraseProgress(ph.id);
    if (DUE_STATUSES.includes(p.status) && p.dueAt != null && p.dueAt <= now && p.dueAt < dueAt) {
      due = ph;
      dueAt = p.dueAt;
    }
  }
  if (due) return getPhrase(due.id);

  const candidates = ALL_PHRASES.filter((ph) => phraseProgress(ph.id).status === "неизвестно");
  if (candidates.length) {
    const candidate = candidates[Math.floor(Math.random() * candidates.length)];
    const p = phraseProgress(candidate.id);
    p.status = "начато";
    p.dueAt = now;
    save();
    return getPhrase(candidate.id);
  }
  return null;
}

export function setStarred(wordId, starred) {
  wordProgress(wordId).starred = starred;
  save();
}
export function setPhraseStarred(phraseId, starred) {
  phraseProgress(phraseId).starred = starred;
  save();
}

// Слова/фразы, добавленные вручную, получают id вида "w-1"/"p-1"
// (см. nextCustomId выше) — у встроенных всегда числовой id, так что этой
// проверки достаточно, чтобы нигде случайно не дать удалить родную колоду.
export function isCustomWordId(id) {
  return typeof id === "string" && id.startsWith("w-");
}
export function isCustomPhraseId(id) {
  return typeof id === "string" && id.startsWith("p-");
}

export function removeCustomWord(id) {
  const idx = state.customWords.findIndex((w) => w.id === id);
  if (idx === -1) return false;
  state.customWords.splice(idx, 1);
  delete state.words[id];
  rebuildWordPool();
  save();
  return true;
}
export function removeCustomPhrase(id) {
  const idx = state.customPhrases.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  state.customPhrases.splice(idx, 1);
  delete state.phrases[id];
  rebuildPhrasePool();
  save();
  return true;
}

export function topicsOverview() {
  const byCat = new Map();
  for (const w of ALL_WORDS) {
    const e = byCat.get(w.category) || { category: w.category, total: 0, learned: 0, starredCount: 0 };
    e.total += 1;
    const p = wordProgress(w.id);
    if (p.status === "изучено") e.learned += 1;
    if (p.starred) e.starredCount += 1;
    byCat.set(w.category, e);
  }
  return [...byCat.values()].sort((a, b) => a.category.localeCompare(b.category, "ru"));
}

// Лимит был 400 - незаметно, пока все темы были маленькие (до полной
// пересборки колоды на частотном списке). Теперь "Базовые слова" разрослась
// до 12000+ слов, и с сортировкой по уровню (см. ниже) старый лимит обрезал
// список ДО того, как дело доходило до A2-C1 - в теме были видны только
// слова уровня A1. Подняла лимит с большим запасом на будущее.
export function wordsInCategory(category, limit = 20000) {
  return ALL_WORDS.filter((w) => w.category === category)
    .map((w) => getWord(w.id))
    .sort((a, b) => {
      if (a.starred !== b.starred) return a.starred ? -1 : 1;
      const la = LEVEL_ORDER[a.level] ?? 99, lb = LEVEL_ORDER[b.level] ?? 99;
      if (la !== lb) return la - lb;
      return a.word_es.localeCompare(b.word_es, "es");
    })
    .slice(0, limit);
}

export function searchWords(query, limit = 80) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ALL_WORDS.filter(
    (w) =>
      w.word_es.toLowerCase().includes(q) ||
      w.translation_ru.toLowerCase().includes(q) ||
      (w.translation_en || "").toLowerCase().includes(q)
  )
    .map((w) => getWord(w.id))
    .sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category, "ru");
      const la = LEVEL_ORDER[a.level] ?? 99, lb = LEVEL_ORDER[b.level] ?? 99;
      if (la !== lb) return la - lb;
      return a.word_es.localeCompare(b.word_es, "es");
    })
    .slice(0, limit);
}

export function pickDirection(wordRow) {
  if (wordRow.status === "требует проверки") return { direction: "ru_to_es", isStrictVerifyMode: true };
  return { direction: Math.random() < 0.5 ? "ru_to_es" : "es_to_ru", isStrictVerifyMode: false };
}

export function phraseOptions(phraseRow) {
  const opts = [phraseRow.phrase_es, phraseRow.distractor1, phraseRow.distractor2, phraseRow.distractor3];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return opts;
}

export function statusCounts(kind) {
  const rows = kind === "phrases" ? ALL_PHRASES : ALL_WORDS;
  const prog = kind === "phrases" ? phraseProgress : wordProgress;
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const r of rows) counts[prog(r.id).status] += 1;
  return counts;
}

// --- применение результата ответа ------------------------------------------

export function applyReview(kind, id, { correct, isStrictVerifyMode }) {
  const p = kind === "phrases" ? phraseProgress(id) : wordProgress(id);
  const result = reviewCard({
    status: p.status,
    intervalStage: p.intervalStage,
    easeFactor: p.easeFactor,
    correctStreakVerify: p.correctStreakVerify,
    correct,
    isStrictVerifyMode,
  });
  p.status = result.newStatus;
  p.intervalStage = result.intervalStage;
  p.easeFactor = result.easeFactor;
  p.correctStreakVerify = result.correctStreakVerify;
  p.dueAt = result.dueAt;
  p.lastReviewedAt = Date.now();
  save();
  return result;
}

export function markLearned(kind, id) {
  const p = kind === "phrases" ? phraseProgress(id) : wordProgress(id);
  p.status = "изучено";
  p.dueAt = Date.now() + 60 * 24 * 60 * 60 * 1000;
  p.lastReviewedAt = Date.now();
  save();
}

// --- достижения / стрик / прогресс по уровням-темам ------------------------

export function currentStreakDays() {
  const activeDays = new Set(
    Object.entries(state.dailyProgress)
      .filter(([, row]) => row.totalCount > 0)
      .map(([date]) => date)
  );
  if (!activeDays.size) return 0;

  let streak = 0;
  let cursor = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  if (!activeDays.has(iso(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (activeDays.has(iso(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function levelPct() {
  const totals = {};
  for (const w of ALL_WORDS) {
    if (!w.level) continue;
    const e = (totals[w.level] ||= { total: 0, learned: 0 });
    e.total += 1;
    if (wordProgress(w.id).status === "изучено") e.learned += 1;
  }
  const out = {};
  for (const [lvl, e] of Object.entries(totals)) out[lvl] = e.total ? (100 * e.learned) / e.total : 0;
  return out;
}

function topicPct() {
  const totals = {};
  for (const w of ALL_WORDS) {
    const e = (totals[w.category] ||= { total: 0, learned: 0 });
    e.total += 1;
    if (wordProgress(w.id).status === "изучено") e.learned += 1;
  }
  const out = {};
  for (const [cat, e] of Object.entries(totals)) out[cat] = e.total ? (100 * e.learned) / e.total : 0;
  return out;
}

export function buildAchievementContext() {
  return {
    streakDays: currentStreakDays(),
    wordsLearned: ALL_WORDS.filter((w) => wordProgress(w.id).status === "изучено").length,
    phrasesLearned: ALL_PHRASES.filter((p) => phraseProgress(p.id).status === "изучено").length,
    phrasesTotal: Math.max(1, ALL_PHRASES.length),
    starredCount: ALL_WORDS.filter((w) => wordProgress(w.id).starred).length,
    earnedCount: state.earnedAchievements.length,
    placementDone: !!state.settings.placementLevel,
    levelPct: levelPct(),
    topicPct: topicPct(),
  };
}

export function syncAchievements() {
  const ctx = buildAchievementContext();
  const already = new Set(state.earnedAchievements);
  const newlyEarned = [];
  for (const ach of CATALOG) {
    if (already.has(ach.id)) continue;
    if (ach.check(ctx)) {
      state.earnedAchievements.push(ach.id);
      newlyEarned.push(ach);
    }
  }
  if (newlyEarned.length) save();
  return newlyEarned;
}

export function allAchievementStatus() {
  syncAchievements();
  const earnedIds = new Set(state.earnedAchievements);
  const earned = CATALOG.filter((a) => earnedIds.has(a.id)).map((a) => ({ ...a, earned: true }));
  const locked = CATALOG.filter((a) => !earnedIds.has(a.id)).map((a) => ({ ...a, earned: false }));
  return [...earned, ...locked];
}

// --- настройки / тест-плейсмент --------------------------------------------

export function getTreeSettings() {
  return {
    treeColor: state.settings.treeColor,
    fruitColor: state.settings.fruitColor,
    fruitShape: state.settings.fruitShape,
  };
}
export function setTreeSettings({ treeColor, fruitColor, fruitShape }) {
  if (treeColor) state.settings.treeColor = treeColor;
  if (fruitColor) state.settings.fruitColor = fruitColor;
  if (fruitShape) state.settings.fruitShape = fruitShape;
  save();
}

export function getPlacementInfo() {
  return { level: state.settings.placementLevel, completedAt: state.settings.placementCompletedAt };
}

const PLACEMENT_KNOWN_THRESHOLD = 85;
const PLACEMENT_VERIFY_DELAY_MS = 3 * 24 * 60 * 60 * 1000;

function applyPlacementAnswers(answers) {
  const now = Date.now();
  for (const a of answers || []) {
    if (a.score < PLACEMENT_KNOWN_THRESHOLD) continue;
    const p = wordProgress(a.wordId);
    if (p.status !== "неизвестно" && p.status !== "начато") continue; // не трогаем то, что уже дальше по прогрессу
    p.status = "изучено";
    p.dueAt = now + PLACEMENT_VERIFY_DELAY_MS;
    p.easeFactor = STARTING_EASE;
    p.correctStreakVerify = 0;
  }
}

export function savePlacementResult(result, answers) {
  state.settings.placementLevel = result.level;
  state.settings.placementCompletedAt = new Date().toISOString();
  applyPlacementAnswers(answers);
  save();
}

export function allWords() {
  return ALL_WORDS;
}
export function allPhrases() {
  return ALL_PHRASES;
}

// --- режим "Имитация" (тексты с пропущенными глаголами) ------------------

function wordEsLookup() {
  if (!wordEsIndex) {
    wordEsIndex = new Map();
    for (const w of ALL_WORDS) wordEsIndex.set(normalize(w.word_es), w.id);
  }
  return wordEsIndex;
}

const FORCE_UNLOCK_IDS = [1];

export function mimicryTextsOverview() {
  const lookup = wordEsLookup();
  return TEXTS.map((t) => {
    const verbs = verbsInText(t.raw);
    let learnedCount = 0;
    const missingVerbs = [];
    for (const v of verbs) {
      const id = lookup.get(normalize(v));
      const learned = id != null && wordProgress(id).status === "изучено";
      if (learned) learnedCount += 1;
      else missingVerbs.push(v);
    }
    return {
      id: t.id,
      title: t.title,
      verbsTotal: verbs.length,
      verbsLearned: learnedCount,
      unlocked: verbs.length > 0 && missingVerbs.length === 0 || FORCE_UNLOCK_IDS.includes(t.id),
      missingVerbs,
    };
  });
}

export function getMimicryText(id) {
  return TEXTS.find((t) => t.id === id) || null;
}

// Только для отладки/тестов: сброс всего прогресса.
export function _resetAllForTests() {
  state = defaultProgress();
}
