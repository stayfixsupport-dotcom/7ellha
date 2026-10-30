import { describe, expect, it } from 'vitest';
import { normalizedMark, studentSujets, validMark } from '../lib/grading';
import { SEED_SUJETS } from '../lib/data';
import { mathLatex } from '../lib/math';

describe('exam rules', () => {
  it('normalizes full credit to exactly 20 regardless of original total', () => {
    const sujet = SEED_SUJETS[0];
    if (!sujet) throw new Error('Missing fixture');
    const scores = Object.fromEntries(sujet.exercises.flatMap((e) => e.questions.map((q) => [q.id, q.points])));
    expect(normalizedMark(sujet, scores)).toBe(20);
    expect(normalizedMark(sujet, {})).toBe(0);
  });
  it('rejects marks outside 0 to 20', () => {
    expect(validMark(20)).toBe(true); expect(validMark(20.1)).toBe(false);
    expect(validMark(-1)).toBe(false); expect(validMark(NaN)).toBe(false);
  });
  it('only returns the students selected level', () => {
    expect(studentSujets(SEED_SUJETS, 'bac').map((s) => s.id)).toEqual(['s1']);
    expect(studentSujets(SEED_SUJETS, 'bem').map((s) => s.id)).toEqual(['s3', 's5']);
  });
  it('typesets legacy fractions, powers, and sequence subscripts', () => {
    expect(mathLatex('(x+1)/(x-1)')).toBe('\\frac{x+1}{x-1}');
    expect(mathLatex('Uₙ₊₁ = x²')).toBe('U_{n+1} = x^{2}');
    expect(mathLatex('\\sin x + \\lim_{x\\to 0}x')).toBe('\\sin x + \\lim_{x\\to 0}x');
  });
});