import type { Sujet } from './data';

export type Correction = {
  scores: Record<string, number>;
  comments: Record<string, string>;
  mark: number;
  note: string;
  publishedAt?: string;
};
export const validMark = (mark: number) => Number.isFinite(mark) && mark >= 0 && mark <= 20;
export function normalizedMark(sujet: Sujet, scores: Record<string, number>): number {
  const questions = sujet.exercises.flatMap((e) => e.questions);
  const possible = questions.reduce((sum, q) => sum + q.points, 0);
  const earned = questions.reduce((sum, q) => sum + Math.min(q.points, Math.max(0, scores[q.id] ?? 0)), 0);
  return possible > 0 ? Math.round(earned / possible * 200) / 10 : 0;
}
export function studentSujets(sujets: Sujet[], level: string) { return sujets.filter((s) => s.level === level); }