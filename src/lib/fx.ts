// Warm, musical synthesized sounds (no audio files) + haptics.
// Notes use soft "marimba/bell" voices with a light echo so they don't feel robotic.
let ctx: AudioContext | null = null;
let out: GainNode | null = null;
function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.ratio.value = 3;
    out = ctx.createGain(); out.gain.value = 0.32;
    // soft echo for warmth
    const d = ctx.createDelay(); d.delayTime.value = 0.13;
    const fb = ctx.createGain(); fb.gain.value = 0.22;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2800;
    out.connect(comp); out.connect(d); d.connect(lp).connect(fb).connect(d); lp.connect(comp);
    comp.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Marimba/bell-like note: fundamental + soft harmonics, natural decay. */
function note(freq: number, { dur = 0.5, vol = 0.7, delay = 0, bright = 0.3 } = {}) {
  const a = ac(); if (!a || !out) return;
  const t = a.currentTime + delay;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1200 + bright * 5000;
  g.connect(f).connect(out);
  [[1, 1], [2, 0.35 * bright + 0.1], [3.99, 0.12 * bright]].forEach(([m, v]) => {
    const o = a.createOscillator(); const og = a.createGain();
    o.type = "sine"; o.frequency.value = freq * m!; og.gain.value = v!;
    o.connect(og).connect(g); o.start(t); o.stop(t + dur + 0.05);
  });
}

export function vibrate(p: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(p); } catch { /* ignore */ }
  }
}

// C major pentatonic, rising
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];

export const sfx = {
  unlock: () => ac(),
  /** soft wooden click for any button */
  tap: () => { note(880, { dur: 0.12, vol: 0.35, bright: 0.1 }); vibrate(8); },
  /** soft low "back" knock, different from forward taps */
  back: () => { note(330, { dur: 0.16, vol: 0.4, bright: 0 }); note(262, { dur: 0.22, vol: 0.32, delay: 0.06, bright: 0 }); vibrate(6); },
  pop: () => { note(659, { dur: 0.18, vol: 0.5, bright: 0.3 }); note(988, { dur: 0.2, vol: 0.35, delay: 0.05, bright: 0.3 }); vibrate(12); },
  /**
   * Progress sound: step 0 is gentle, each next step gets a little brighter/fuller.
   * The last step plays the success melody.
   */
  step: (i: number, total: number) => {
    if (i >= total - 1) { sfx.chord(); return; }
    const k = Math.min(i, SCALE.length - 3);
    const p = total > 1 ? i / (total - 1) : 0;
    const vol = 0.35 + p * 0.45, bright = 0.1 + p * 0.7;
    note(SCALE[k]!, { dur: 0.5, vol, bright });
    note(SCALE[k + 2]!, { dur: 0.6, vol: vol * 0.8, delay: 0.09, bright });
    if (i >= 1) note(SCALE[k + 2]! * 2, { dur: 0.4, vol: vol * 0.3, delay: 0.16, bright });
    vibrate(10 + i * 8);
  },
  bounce: (i: number) => { note(SCALE[i % SCALE.length]!, { dur: 0.35, vol: 0.4 + i * 0.06, bright: 0.2 + i * 0.1 }); },
  lock: (i: number) => { note(SCALE[(i + 2) % SCALE.length]!, { dur: 0.6, vol: 0.5 + i * 0.07, bright: 0.3 + i * 0.1 }); vibrate([15, 20, 15]); },
  whoosh: () => { note(659, { dur: 0.3, vol: 0.4, bright: 0.2 }); note(784, { dur: 0.35, vol: 0.35, delay: 0.07, bright: 0.2 }); },
  /** happy rising arpeggio + shimmering chord */
  chord: () => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, { dur: 0.45, vol: 0.6, delay: i * 0.09, bright: 0.6 }));
    [1046.5, 1318.5, 1568].forEach((f) => note(f, { dur: 1.4, vol: 0.4, delay: 0.4, bright: 0.8 }));
    vibrate([30, 40, 60]);
  },
  success: () => { note(784, { dur: 0.3, vol: 0.6, bright: 0.5 }); note(1046.5, { dur: 0.6, vol: 0.6, delay: 0.1, bright: 0.6 }); vibrate([15, 20, 15]); },
  /** soft "uh-oh" two notes down */
  error: () => { note(311, { dur: 0.22, vol: 0.55, bright: 0 }); note(233, { dur: 0.5, vol: 0.55, delay: 0.14, bright: 0 }); vibrate([40, 30, 40]); },
  scan: () => { [0, 1, 2, 3].forEach((i) => note(SCALE[i]!, { dur: 0.25, vol: 0.3, delay: i * 0.12, bright: 0.2 })); },
};
