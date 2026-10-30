import katex from 'katex';
import { mathLatex, mathSegments } from '@/lib/math';

export function MathText({ text }: { text: string }) {
  return <span className="math-text">{mathSegments(text).map((part, i) => part.math
    ? <span key={i} dir="ltr" className={part.display ? 'math-formula math-display' : 'math-formula'} dangerouslySetInnerHTML={{ __html: katex.renderToString(mathLatex(part.text), { throwOnError: false, strict: false, trust: false, displayMode: part.display ?? false, output: 'htmlAndMathml' }) }} />
    : <span key={i}>{part.text}</span>)}</span>;
}