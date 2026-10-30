import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadExamPdf, shareExamPdf } from '@/lib/pdf';

describe('PDF delivery', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('downloads an application/pdf file using a same-origin blob URL', async () => {
    const createObjectURL = vi.fn(() => 'blob:http://localhost/exam');
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('exam.pdf');
      expect(this.href).toBe('blob:http://localhost/exam');
      expect(this.isConnected).toBe(true);
    });
    const blob = new Blob(['exam'], { type: 'application/pdf' });
    await downloadExamPdf(blob, 'exam.pdf');
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledOnce();
  });

  it('offers Save to Files through file sharing on supported touch devices', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const share = vi.fn<(data: ShareData) => Promise<void>>().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { canShare: () => true, share });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await downloadExamPdf(new Blob(['exam'], { type: 'application/pdf' }), 'exam.pdf');
    expect(share).toHaveBeenCalledOnce();
    const file = share.mock.calls[0]?.[0].files?.[0];
    if (!file) throw new Error('Expected a shared PDF file');
    expect(file.name).toBe('exam.pdf');
    expect(file.type).toBe('application/pdf');
    expect(click).not.toHaveBeenCalled();
  });

  it('can start a direct download without opening the touch share sheet', async () => {
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:http://localhost/exam', revokeObjectURL: vi.fn() });
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { canShare: () => true, share });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await downloadExamPdf(new Blob(['exam'], { type: 'application/pdf' }), 'exam.pdf', { preferShare: false });

    expect(share).not.toHaveBeenCalled();
    expect(click).toHaveBeenCalledOnce();
  });

  it('does not trigger an unwanted download when the share sheet is cancelled', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    vi.stubGlobal('navigator', { canShare: () => true, share: vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError')) });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await downloadExamPdf(new Blob(['exam'], { type: 'application/pdf' }), 'exam.pdf');
    expect(click).not.toHaveBeenCalled();
  });

  it('shares the generated PDF file instead of an app URL', async () => {
    const share = vi.fn<(data: ShareData) => Promise<void>>().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { canShare: () => true, share });

    const result = await shareExamPdf(new Blob(['exam'], { type: 'application/pdf' }), 'answer.pdf');

    expect(result).toBe('shared');
    expect(share).toHaveBeenCalledOnce();
    expect(share.mock.calls[0]?.[0].url).toBeUndefined();
    expect(share.mock.calls[0]?.[0].files?.[0]?.name).toBe('answer.pdf');
  });

  it('downloads the PDF when file sharing is unavailable', async () => {
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:http://localhost/answer', revokeObjectURL: vi.fn() });
    vi.stubGlobal('navigator', { canShare: () => false });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('answer.pdf');
    });

    const result = await shareExamPdf(new Blob(['exam'], { type: 'application/pdf' }), 'answer.pdf');

    expect(result).toBe('downloaded');
    expect(click).toHaveBeenCalledOnce();
  });

  it('does not download when the user cancels file sharing', async () => {
    const share = vi.fn<(data: ShareData) => Promise<void>>().mockRejectedValue(new DOMException('Cancelled', 'AbortError'));
    vi.stubGlobal('navigator', { canShare: () => true, share });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const result = await shareExamPdf(new Blob(['exam'], { type: 'application/pdf' }), 'answer.pdf');

    expect(result).toBe('cancelled');
    expect(click).not.toHaveBeenCalled();
  });
});