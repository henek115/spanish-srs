export const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

export function computeResult(answers) {
  if (!answers.length) {
    return { level: LEVELS[0], levelIndex: 0, familiarPct: 0, topicScores: {}, strongTopics: [], weakTopics: [], wordCount: 0 };
  }

  const totalScore = answers.reduce((s, a) => s + a.score, 0);
  const weightedIndex = totalScore > 0
    ? answers.reduce((s, a) => s + a.score * LEVELS.indexOf(a.level), 0) / totalScore
    : 0;
  const levelIndex = Math.max(0, Math.min(LEVELS.length - 1, Math.round(weightedIndex)));

  const topicTotals = {};
  for (const a of answers) {
    (topicTotals[a.category] ||= []).push(a.score);
  }
  const topicScores = {};
  for (const [cat, vals] of Object.entries(topicTotals)) {
    topicScores[cat] = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  }

  const strongTopics = Object.keys(topicScores).filter((c) => topicScores[c] >= 70).sort((a, b) => topicScores[b] - topicScores[a]);
  const weakTopics = Object.keys(topicScores).filter((c) => topicScores[c] < 40).sort((a, b) => topicScores[a] - topicScores[b]);

  return { level: LEVELS[levelIndex], levelIndex, familiarPct: Math.round((totalScore / (100 * answers.length)) * 100), topicScores, strongTopics, weakTopics, wordCount: answers.length };
}

export function buildPool(words) {
  const categories = [...new Set(words.map((w) => w.category))].sort();
  const pool = [];
  for (const category of categories) {
    for (const level of LEVELS) {
      const candidates = words.filter((w) => w.category === category && w.level === level);
      if (candidates.length) pool.push(candidates[Math.floor(Math.random() * candidates.length)]);
    }
  }
  return pool;
}