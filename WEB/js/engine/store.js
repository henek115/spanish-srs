// Хранилище прогресса + подбор следующей карточки - порт app/deck.py и
// app/db.py (настройки, дневной лимит) поверх localStorage вместо SQLite.
// Сама колода (слова/фразы) - статичные данные из data/*-data.js, прогресс
// по каждому слову/фразе (статус, интервал, флаг "в приоритете" и т.д.)
// хранится отдельно и объединяется на лету - так же будет проще потом
// перенести именно прогресс (а не всю колоду) в Firestore для синка.

import { WORDS } from "../../data/words-data.js";
import { PHRASES } from "../../data/phrases-data.js";
import { reviewCard, STARTING_EASE } from "./srs.js";
import { CATALOG } from "./achievements.js";

const LS_KEY = "spanish-srs-progress-v1";
const LEVEL_ORDER = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4 };
const DUE_STATUSES = ["начато", "в процессе", "требует проверки", "изучено"];
export const STATUSES = ["неизвестно", "начато", "в процессе", "требует проверки", "изучено"];

const WORDS_BY_ID = new Map(WORDS.map((w) => [w.id, w]));
const PHRASES_BY_ID = new Map(PHRASES.map((p) => [p.id, p]));

function today() {
  return new Date().toISOString().slice(0, 10);
}

function defaultProgress() {
  return {
    words: {},
    phrases: {},
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
    };
  } catch (e) {
    console.warn("не удалось прочитать сохранённый прогресс, начинаю заново", e);
    return defaultProgress();
  }
}

let state = loadState();
let saveTimer = null;

function save() {
  // Небольшой дебаунс: во время быстрого набора ответов не пишем в
  // localStorage на каждый keypress, только на реальные события SRS.
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("не удалось сохранить прогресс", e);
    }
  }, 50);
}

export function flushSave() {
  if (saveTimer) clearTimeout(saveTimer);
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("не удалось сохранить прогресс", e);
  }
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
  const candidates = WORDS.filter((w) => wordProgress(w.id).status === "неизвестно");
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
  for (const w of WORDS) {
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
  for (const ph of PHRASES) {
    const p = phraseProgress(ph.id);
    if (DUE_STATUSES.includes(p.status) && p.dueAt != null && p.dueAt <= now && p.dueAt < dueAt) {
      due = ph;
      dueAt = p.dueAt;
    }
  }
  if (due) return getPhrase(due.id);

  const candidates = PHRASES.filter((ph) => phraseProgress(ph.id).status === "неизвестно");
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

export function topicsOverview() {
  const byCat = new Map();
  for (const w of WORDS) {
    const e = byCat.get(w.category) || { category: w.category, total: 0, learned: 0, starredCount: 0 };
    e.total += 1;
    const p = wordProgress(w.id);
    if (p.status === "изучено") e.learned += 1;
    if (p.starred) e.starredCount += 1;
    byCat.set(w.category, e);
  }
  return [...byCat.values()].sort((a, b) => a.category.localeCompare(b.category, "ru"));
}

export function wordsInCategory(category, limit = 400) {
  return WORDS.filter((w) => w.category === category)
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
  return WORDS.filter(
    (w) => w.word_es.toLowerCase().includes(q) || w.translation_ru.toLowerCase().includes(q)
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
  const rows = kind === "phrases" ? PHRASES : WORDS;
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
  for (const w of WORDS) {
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
  for (const w of WORDS) {
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
    wordsLearned: WORDS.filter((w) => wordProgress(w.id).status === "изучено").length,
    phrasesLearned: PHRASES.filter((p) => phraseProgress(p.id).status === "изучено").length,
    phrasesTotal: Math.max(1, PHRASES.length),
    starredCount: WORDS.filter((w) => wordProgress(w.id).starred).length,
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
export function savePlacementResult(result) {
  state.settings.placementLevel = result.level;
  state.settings.placementCompletedAt = new Date().toISOString();
  save();
}

export function allWords() {
  return WORDS;
}
export function allPhrases() {
  return PHRASES;
}

// Только для отладки/тестов: сброс всего прогресса.
export function _resetAllForTests() {
  state = defaultProgress();
}