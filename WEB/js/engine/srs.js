const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const LEARNING_STEPS_MS = [7 * MIN, HOUR, DAY, 3 * DAY, 7 * DAY, 30 * DAY];
export const MIN_EASE = 1.3;
export const STARTING_EASE = 2.5;
export const VERIFY_STREAK_TO_GRADUATE = 4;

export function reviewCard({ status, intervalStage, easeFactor, correctStreakVerify, correct, isStrictVerifyMode }) {
  const now = Date.now();
  easeFactor = easeFactor || STARTING_EASE;

  if (!correct) {
    const newStatus = status !== "начато" ? "в процессе" : "начато";
    return {
      newStatus,
      dueAt: now + LEARNING_STEPS_MS[0],
      intervalStage: 0,
      easeFactor: Math.max(MIN_EASE, easeFactor - 0.2),
      correctStreakVerify: 0,
    };
  }

  if (status === "неизвестно" || status === "начато") {
    return { newStatus: "в процессе", dueAt: now + LEARNING_STEPS_MS[0], intervalStage: 1, easeFactor, correctStreakVerify: 0 };
  }

  if (status === "в процессе") {
    const nextStage = intervalStage + 1;
    if (nextStage < LEARNING_STEPS_MS.length) {
      return { newStatus: "в процессе", dueAt: now + LEARNING_STEPS_MS[nextStage], intervalStage: nextStage, easeFactor, correctStreakVerify: 0 };
    }
    return { newStatus: "требует проверки", dueAt: now, intervalStage: nextStage, easeFactor, correctStreakVerify: 0 };
  }

  if (status === "требует проверки") {
    const streak = isStrictVerifyMode ? correctStreakVerify + 1 : correctStreakVerify;
    const newEase = isStrictVerifyMode ? Math.min(3.0, easeFactor + 0.05) : easeFactor;
    if (streak >= VERIFY_STREAK_TO_GRADUATE) {
      return { newStatus: "изучено", dueAt: now + 60 * DAY, intervalStage, easeFactor: newEase, correctStreakVerify: streak };
    }
    const spacing = LEARNING_STEPS_MS[LEARNING_STEPS_MS.length - 1];
    return { newStatus: "требует проверки", dueAt: now + spacing, intervalStage, easeFactor: newEase, correctStreakVerify: streak };
  }

  if (status === "изучено") {
    const newEase = Math.min(3.0, easeFactor + 0.05);
    const days = Math.max(30, 30 * newEase);
    return { newStatus: "изучено", dueAt: now + days * DAY, intervalStage, easeFactor: newEase, correctStreakVerify };
  }

  throw new Error(`unknown status: ${status}`);
}