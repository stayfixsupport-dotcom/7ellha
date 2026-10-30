/** Browser-only PDF export: the PDF itself contains no browser headers or URLs. */
export async function exportExamPdf(sheet: HTMLElement, filename: string) {
  const [{ default: capture }, { jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')]);
  await document.fonts.ready;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  pdf.setProperties({ title: filename.replace(/\.pdf$/i, ''), creator: '7ellha — حلّها' });
  let pageCount = 0;
  const host = document.createElement('div');
  host.className = 'pdf-export-host';
  const documentClone = sheet.cloneNode(true) as HTMLElement;
  documentClone.classList.remove('offline-pdf-source');
  documentClone.removeAttribute('aria-hidden');
  host.append(documentClone);
  document.body.append(host);
  try {
    await Promise.all([...host.querySelectorAll('img')].map(async (image) => {
      if (!image.complete) await image.decode();
    }));
    // Use the print-safe sRGB paper token: older canvas implementations can
    // silently ignore an oklch fillStyle and retain their default black fill.
    const paper = getComputedStyle(host).getPropertyValue('--pdf-paper').trim();
    for (const clone of documentClone.querySelectorAll<HTMLElement>('.pdf-section')) {
      const canvas = await capture(clone, { scale: 2, useCORS: true, backgroundColor: paper, logging: false });
      const ratio = canvas.width / 190;
      const maxHeight = Math.floor(277 * ratio);
      const rect = clone.getBoundingClientRect();
      const blocks = [...clone.querySelectorAll<HTMLElement>('.pdf-block')].map((block) => {
        const box = block.getBoundingClientRect();
        return { top: Math.floor((box.top - rect.top) * 2), bottom: Math.ceil((box.bottom - rect.top) * 2) };
      });
      let y = 0;
      while (y < canvas.height) {
        let end = Math.min(y + maxHeight, canvas.height);
        const crossing = blocks.find((b) => b.top > y && b.top < end && b.bottom > end && b.bottom - b.top < maxHeight);
        if (crossing) end = crossing.top;
        const page = document.createElement('canvas');
        page.width = canvas.width; page.height = Math.max(1, end - y);
        const ctx = page.getContext('2d');
        if (!ctx) throw new Error('Canvas unavailable');
        // JPEG has no alpha channel: flatten onto paper, never transparent black.
        ctx.fillStyle = paper;
        ctx.fillRect(0, 0, page.width, page.height);
        ctx.drawImage(canvas, 0, y, canvas.width, page.height, 0, 0, canvas.width, page.height);
        if (pageCount > 0) pdf.addPage();
        pdf.addImage(page.toDataURL('image/png'), 'PNG', 10, 10, 190, page.height / ratio, undefined, 'FAST');
        pageCount++;
        y = end;
      }
    }
    if (!pageCount) throw new Error('No exam pages');
    return pdf.output('blob');
  } finally { host.remove(); }
}

/** Called from a user action to deliver a prepared PDF, including on mobile Safari. */
export async function downloadExamPdf(blob: Blob, filename: string, { preferShare = true }: { preferShare?: boolean } = {}) {
  const file = new File([blob], filename, { type: 'application/pdf' });
  if (preferShare && matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return; }
    catch (error) { if ((error as DOMException).name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export async function shareExamPdf(blob: Blob, filename: string): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([blob], filename, { type: "application/pdf" });
  if (!navigator.share || !navigator.canShare?.({ files: [file] })) {
    await downloadExamPdf(blob, filename);
    return "downloaded";
  }

  try {
    await navigator.share({ files: [file], title: filename });
    return "shared";
  } catch (error) {
    if ((error as DOMException).name === "AbortError") return "cancelled";
    await downloadExamPdf(blob, filename);
    return "downloaded";
  }
}