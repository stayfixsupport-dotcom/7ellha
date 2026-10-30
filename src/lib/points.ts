import type { Sujet } from "./data";
import type { StudyDay } from "./streak";
import type { Submission } from "./store";

export const POINTS_PER_ANSWER = 10;
export const POINTS_PER_SUBMITTED_SUJET = 25;

export type PointEntry = {
  id: string;
  day: string;
  title: string;
  description: string;
  points: number;
  kind: "answers" | "submission";
};

export function getStudentPointLedger(
  studyDays: StudyDay[],
  submissions: Submission[],
  sujets: Sujet[],
) {
  const entries: PointEntry[] = [];
  const seenQuestions = new Set<string>();

  for (const day of [...studyDays].sort((a, b) => a.day.localeCompare(b.day))) {
    const newQuestions = day.questionIds.filter((id) => {
      if (seenQuestions.has(id)) return false;
      seenQuestions.add(id);
      return true;
    });
    if (newQuestions.length) {
      entries.push({
        id: `answers-${day.day}`,
        day: day.day,
        title: "إجابات عملت عليها",
        description: `${newQuestions.length} ${newQuestions.length === 1 ? "سؤال" : "أسئلة"} محفوظة`,
        points: newQuestions.length * POINTS_PER_ANSWER,
        kind: "answers",
      });
    }
  }

  const sujetTitles = new Map(sujets.map((sujet) => [sujet.id, sujet.title]));
  const submittedSujets = new Set<string>();
  for (const submission of [...submissions].sort((a, b) => a.sentAt.localeCompare(b.sentAt))) {
    if (submittedSujets.has(submission.sujetId)) continue;
    submittedSujets.add(submission.sujetId);
    const day = /^\d{4}-\d{2}-\d{2}/.test(submission.sentAt)
      ? submission.sentAt.slice(0, 10)
      : "";
    entries.push({
      id: `submission-${submission.sujetId}`,
      day,
      title: sujetTitles.get(submission.sujetId) ?? "موضوع",
      description: "أول حل ترسله لهذا الموضوع",
      points: POINTS_PER_SUBMITTED_SUJET,
      kind: "submission",
    });
  }

  entries.sort((a, b) => b.day.localeCompare(a.day) || a.id.localeCompare(b.id));
  return {
    total: entries.reduce((sum, entry) => sum + entry.points, 0),
    entries,
    answeredQuestions: seenQuestions.size,
    submittedSujets: submittedSujets.size,
  };
}
