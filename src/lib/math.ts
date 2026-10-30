const superscripts: Record<string, string> = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', 'ˣ': 'x', 'ⁿ': 'n', '⁻': '-' };

export function mathLatex(raw: string): string {
  let s = raw.trim().replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹ˣⁿ⁻]+/g, (v) => `^{${[...v].map((c) => superscripts[c]).join('')}}`)
    .replace(/ₙ₊₁/g, '_{n+1}').replace(/ₙ/g, '_n').replace(/₀/g, '_0').replace(/₁/g, '_1').replace(/₂/g, '_2')
    .replace(/−/g, '-').replace(/×/g, '\\times ').replace(/·/g, '\\cdot ').replace(/½/g, '\\frac{1}{2}')
    .replace(/√\s*([αa-z0-9]+)/g, '\\sqrt{$1}').replace(/ℝ/g, '\\mathbb{R}').replace(/∞/g, '\\infty ')
    .replace(/α/g, '\\alpha ').replace(/π/g, '\\pi ').replace(/τ/g, '\\tau ').replace(/→/g, '\\to ')
    .replace(/(?<!\\)\blim_\{/g, '\\displaystyle\\lim_{').replace(/(?<!\\)\b(sin|cos|tan|ln|log|exp)\b/g, '\\$1 ');
  // Preserve existing LaTeX; convert slash fractions from older scans using balanced operands.
  for (let pos = s.indexOf('/'); pos >= 0; pos = s.indexOf('/')) {
    let l = pos - 1, r = pos + 1;
    while (s[l] === ' ') l--;
    while (s[r] === ' ') r++;
    const endLeft = l + 1;
    if (s[l] === ')') { let depth = 1; l--; while (l >= 0 && depth) { if (s[l] === ')') depth++; if (s[l] === '(') depth--; l--; } }
    else { while (l >= 0 && /[\w.]/.test(s[l] ?? '')) l--; }
    const startRight = r;
    if (s[r] === '(') { let depth = 1; r++; while (r < s.length && depth) { if (s[r] === '(') depth++; if (s[r] === ')') depth--; r++; } }
    else { while (r < s.length && /[\w.]/.test(s[r] ?? '')) r++; }
    if (l + 1 === endLeft || r === startRight) { s = s.slice(0, pos) + '\\mathbin{÷}' + s.slice(pos + 1); continue; }
    if (s.slice(r, r + 2) === '^{') { const end = s.indexOf('}', r + 2); if (end >= 0) r = end + 1; }
    const strip = (v: string) => v.startsWith('(') && v.endsWith(')') ? v.slice(1, -1) : v;
    s = s.slice(0, l + 1) + `\\frac{${strip(s.slice(l + 1, endLeft))}}{${strip(s.slice(startRight, r))}}` + s.slice(r);
  }
  return s;
}

export function mathSegments(text: string): { text: string; math: boolean; display?: boolean }[] {
  const chunks = text.split(/(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g);
  return chunks.flatMap((chunk) => {
    if (/^(\\\[|\\\(|\$)/.test(chunk)) {
      const display = chunk.startsWith('\\[') || chunk.startsWith('$$');
      const edge = chunk.startsWith('$') && !display ? 1 : 2;
      return [{ text: chunk.slice(edge, -edge), math: true, display }];
    }
    return chunk.split(/([^\u0600-\u06ff\n،؛؟]+(?:[απτ][^\u0600-\u06ff\n،؛؟]*)?)/g).filter(Boolean).map((part) => ({
      text: part, math: /(?:[=^_√ℝ∞⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂ₙ]|\b[fghUVz]\s*(?:['′]?\(|\b)|\blim\b)/.test(part) && !/[a-z]{5,}/i.test(part.replace(/lim|infty|alpha|sqrt/g, '')),
    }));
  });
}