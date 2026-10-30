import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MobileKeyboard } from '@/components/MobileKeyboard';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

function setup(mobile: boolean) {
  vi.useFakeTimers();
  const viewport = Object.assign(new EventTarget(), { height: 621, offsetTop: 0, scale: 1 });
  vi.stubGlobal('visualViewport', viewport);
  vi.stubGlobal('innerHeight', 621);
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: mobile } as MediaQueryList);
  render(<><MobileKeyboard /><input aria-label="Name" /><textarea aria-label="Answer" /></>);
  const field = document.querySelector('textarea');
  if (!field) throw new Error('Missing answer field');
  const scroll = vi.fn();
  field.scrollIntoView = scroll;
  vi.spyOn(field, 'getBoundingClientRect').mockReturnValue({ top: 400, bottom: 500 } as DOMRect);
  act(() => { field.focus(); viewport.height = 321; viewport.dispatchEvent(new Event('resize')); vi.advanceTimersByTime(100); });
  return { field, viewport, scroll };
}

describe('phone keyboard focus handling', () => {
  it('moves a covered typing field into view when the phone keyboard opens', () => {
    const { scroll } = setup(true);
    expect(scroll).toHaveBeenCalledWith({ block: 'center', behavior: 'instant' });
  });
  it('does not move desktop typing fields', () => {
    const { scroll } = setup(false);
    expect(scroll).not.toHaveBeenCalled();
  });
  it('stops moving the field after the phone keyboard closes', () => {
    const { viewport, scroll } = setup(true);
    scroll.mockClear();
    act(() => { viewport.height = 621; viewport.dispatchEvent(new Event('resize')); vi.advanceTimersByTime(100); });
    expect(scroll).not.toHaveBeenCalled();
  });
});