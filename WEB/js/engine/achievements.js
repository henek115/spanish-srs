export const ALL_TOPICS = [
  "Базовые слова", "Глаголы", "Грамматика", "Деньги и экономика", "Дом",
  "Досуг и спорт", "Еда", "Здоровье", "Люди", "Магазины и одежда",
  "Общество и праздники", "Окружающая среда", "Работа", "Транспорт", "Учеба",
];

const LEVEL_ACHIEVEMENTS = [
  ["level_a1", "Уровень A1", "A1"], ["level_a2", "Уровень A2", "A2"],
  ["level_b1", "Уровень B1", "B1"], ["level_b2", "Уровень B2", "B2"], ["level_c1", "Уровень C1", "C1"],
];

function topicId(category) {
  const slug = category.toLowerCase().replace(/\s+/g, "_").replace(/[«»]/g, "");
  return `topic_${slug}`;
}
function topicLabel(category) {
  return `Тема «${category}»`;
}

export const CATALOG = [
  { id: "streak_3", label: "3 дня подряд", check: (ctx) => ctx.streakDays >= 3 },
  { id: "streak_7", label: "7 дней подряд", check: (ctx) => ctx.streakDays >= 7 },
  { id: "streak_14", label: "14 дней подряд", check: (ctx) => ctx.streakDays >= 14 },
  { id: "streak_30", label: "30 дней подряд", check: (ctx) => ctx.streakDays >= 30 },
  { id: "streak_60", label: "60 дней подряд", check: (ctx) => ctx.streakDays >= 60 },
  { id: "streak_100", label: "100 дней подряд", check: (ctx) => ctx.streakDays >= 100 },

  { id: "words_10", label: "Первые 10 слов", check: (ctx) => ctx.wordsLearned >= 10 },
  { id: "words_50", label: "50 слов", check: (ctx) => ctx.wordsLearned >= 50 },
  { id: "words_100", label: "100 слов", check: (ctx) => ctx.wordsLearned >= 100 },
  { id: "words_250", label: "250 слов", check: (ctx) => ctx.wordsLearned >= 250 },
  { id: "words_500", label: "500 слов", check: (ctx) => ctx.wordsLearned >= 500 },
  { id: "words_1000", label: "1000 слов", check: (ctx) => ctx.wordsLearned >= 1000 },
  { id: "words_2000", label: "2000 слов", check: (ctx) => ctx.wordsLearned >= 2000 },

  { id: "first_phrase", label: "Первая фраза", check: (ctx) => ctx.phrasesLearned >= 1 },
  { id: "phrases_10", label: "10 фраз", check: (ctx) => ctx.phrasesLearned >= 10 },
  { id: "phrases_25", label: "25 фраз", check: (ctx) => ctx.phrasesLearned >= 25 },
  { id: "phrases_all", label: "Все фразы колоды", check: (ctx) => ctx.phrasesLearned >= ctx.phrasesTotal },

  { id: "test_passed", label: "Тест пройден", check: (ctx) => ctx.placementDone },

  { id: "starred_5", label: "5 слов в приоритете", check: (ctx) => ctx.starredCount >= 5 },
  { id: "collector_10", label: "10 достижений открыто", check: (ctx) => ctx.earnedCount >= 10 },
  { id: "collector_25", label: "25 достижений открыто", check: (ctx) => ctx.earnedCount >= 25 },

  ...LEVEL_ACHIEVEMENTS.map(([id, label, level]) => ({ id, label, check: (ctx) => (ctx.levelPct[level] || 0) >= 100 })),
  ...ALL_TOPICS.map((cat) => ({ id: topicId(cat), label: topicLabel(cat), check: (ctx) => (ctx.topicPct[cat] || 0) >= 100 })),
];