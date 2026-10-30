import { describe, expect, it } from "vitest";
import { getStudentPointLedger } from "@/lib/points";
import type { Sujet } from "@/lib/data";
import type { StudyDay } from "@/lib/streak";
import type { Submission } from "@/lib/store";

const sujet = { id: "exam-1", title: "موضوع الرياضيات", level: "bac", subject: "math" } as Sujet;

describe("student points ledger", () => {
  it("awards points for unique saved answers and the first submission per sujet", () => {
    const studyDays: StudyDay[] = [
      { day: "2026-10-20", questionIds: ["q1", "q2"], sujetIds: ["exam-1"] },
      { day: "2026-10-21", questionIds: ["q2", "q3"], sujetIds: ["exam-1"] },
    ];
    const submissions: Submission[] = [
      { id: "sub-1", sujetId: "exam-1", studentName: "Student", answers: {}, sentAt: "2026-10-21" },
      { id: "sub-2", sujetId: "exam-1", studentName: "Student", answers: {}, sentAt: "2026-10-22" },
    ];

    const ledger = getStudentPointLedger(studyDays, submissions, [sujet]);

    expect(ledger.total).toBe(55);
    expect(ledger.answeredQuestions).toBe(3);
    expect(ledger.submittedSujets).toBe(1);
    expect(ledger.entries).toHaveLength(3);
    expect(ledger.entries.find((entry) => entry.kind === "submission")?.title).toBe("موضوع الرياضيات");
  });

  it("starts with no points before activity is recorded", () => {
    expect(getStudentPointLedger([], [], []).total).toBe(0);
  });
});
