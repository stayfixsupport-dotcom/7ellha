import { describe, expect, it } from "vitest";
import { summarizeStudyDays, type StudyDay } from "@/lib/streak";

const entry = (day: string, questionIds: string[] = ["q1"]): StudyDay => ({
  day,
  questionIds,
  sujetIds: ["s1"],
});

describe("study streak summaries", () => {
  it("counts a streak through today and builds the seven-day activity view", () => {
    const result = summarizeStudyDays(
      [entry("2026-10-16"), entry("2026-10-17"), entry("2026-10-18", ["q1", "q2"])],
      "2026-10-18",
    );

    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
    expect(result.activeToday).toBe(true);
    expect(result.todayQuestions).toBe(2);
    expect(result.week.filter((day) => day.active)).toHaveLength(3);
  });

  it("does not count an old run as current after a missed day", () => {
    const result = summarizeStudyDays(
      [entry("2026-10-10"), entry("2026-10-11"), entry("2026-10-12")],
      "2026-10-18",
    );

    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(3);
    expect(result.activeToday).toBe(false);
  });

  it("starts with a real empty state for a new user", () => {
    const result = summarizeStudyDays([], "2026-10-18");

    expect(result.activeDays).toBe(0);
    expect(result.currentStreak).toBe(0);
    expect(result.week).toHaveLength(7);
    expect(result.week.every((day) => !day.active)).toBe(true);
  });
});
