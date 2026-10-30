import { useEffect } from 'react';

/** Shared visual-viewport handling; desktop and unfocused pages retain their layout. */
export function MobileKeyboard() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    let timer = 0;
    let blurTimer = 0;
    const update = () => {
      const field = document.activeElement;
      const editable = field instanceof HTMLElement && field.matches('input:not([type="file"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]');
      const mobile = window.matchMedia('(any-pointer: coarse)').matches;
      const open = mobile && editable && window.innerHeight - viewport.height > 120 && viewport.scale <= 1.05;
      root.classList.toggle('keyboard-open', open);
      if (!open) {
        root.style.removeProperty('--keyboard-height');
        root.style.removeProperty('--keyboard-top');
        root.style.removeProperty('--keyboard-inset');
        return;
      }
      root.style.setProperty('--keyboard-height', `${viewport.height}px`);
      root.style.setProperty('--keyboard-top', `${viewport.offsetTop}px`);
      root.style.setProperty('--keyboard-inset', `${Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)}px`);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (document.activeElement !== field) return;
        const rect = field.getBoundingClientRect();
        const top = viewport.offsetTop + 16;
        const bottom = viewport.offsetTop + viewport.height - 100;
        if (rect.top < top || rect.bottom > bottom) field.scrollIntoView({ block: 'center', behavior: 'instant' });
      }, 80);
    };
    const onBlur = () => { window.clearTimeout(blurTimer); blurTimer = window.setTimeout(update, 200); };
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', onBlur);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(blurTimer);
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', onBlur);
      root.classList.remove('keyboard-open');
      for (const name of ['--keyboard-height', '--keyboard-top', '--keyboard-inset']) root.style.removeProperty(name);
    };
  }, []);
  return null;
}