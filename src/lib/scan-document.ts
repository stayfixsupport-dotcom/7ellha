const SOURCE_PAGE_MAX_LENGTH = 850_000;

function canvasDataUrl(canvas: HTMLCanvasElement, maxLength: number) {
  let width = canvas.width;
  let height = canvas.height;
  let quality = 0.9;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const scaled = document.createElement("canvas");
    scaled.width = width;
    scaled.height = height;
    const context = scaled.getContext("2d");
    if (!context) throw new Error("تعذّر معالجة صورة الصفحة");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.drawImage(canvas, 0, 0, width, height);
    const image = scaled.toDataURL("image/jpeg", quality);
    if (image.length <= maxLength) return image;

    if (quality > 0.72) quality -= 0.08;
    else {
      width = Math.round(width * 0.88);
      height = Math.round(height * 0.88);
      quality = 0.88;
    }
  }

  throw new Error("تعذّر ضغط صورة الصفحة إلى الحجم المسموح");
}

export async function compressSourcePage(dataUrl: string) {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("تعذّر معالجة صورة الصفحة");
  context.drawImage(image, 0, 0);
  return canvasDataUrl(canvas, SOURCE_PAGE_MAX_LENGTH);
}

/** Keep a readable source page while sending smaller images to vision models. */
export async function renderPdfScanPages(
  file: File,
): Promise<{ pages: string[]; pageTexts: string[]; sourcePages: string[]; text: string }> {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerPort) {
    const { default: PdfWorker } = await import("pdfjs-dist/build/pdf.worker.min.mjs?worker");
    pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();
  }

  const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const pdf = await task.promise;
  try {
    if (pdf.numPages > 40) {
      throw new Error("قسّم الملف إلى أجزاء لا تتجاوز 40 صفحة، حتى لا تُحذف أي صفحة من التحليل");
    }

    const pages: string[] = [];
    const pageTexts: string[] = [];
    const sourcePages: string[] = [];
    const textPages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
        .filter(Boolean)
        .join(" ")
        .trim();
      const labeledPageText = pageText ? `صفحة ${pageNumber}:\n${pageText}` : "";
      pageTexts.push(labeledPageText);
      if (labeledPageText) textPages.push(labeledPageText);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({
        scale: Math.min(1.8, 1600 / Math.max(base.width, base.height)),
      });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("تعذّر معالجة صفحات ملف PDF");
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, viewport }).promise;
      sourcePages.push(canvasDataUrl(canvas, SOURCE_PAGE_MAX_LENGTH));

      const aiScale = Math.min(1, 1200 / Math.max(canvas.width, canvas.height));
      const aiCanvas = document.createElement("canvas");
      aiCanvas.width = Math.ceil(canvas.width * aiScale);
      aiCanvas.height = Math.ceil(canvas.height * aiScale);
      const aiContext = aiCanvas.getContext("2d");
      if (!aiContext) throw new Error("تعذّر تحضير الصفحة للتحليل");
      aiContext.drawImage(canvas, 0, 0, aiCanvas.width, aiCanvas.height);
      pages.push(canvasDataUrl(aiCanvas, SOURCE_PAGE_MAX_LENGTH));
      page.cleanup();
    }

    return {
      pages,
      pageTexts,
      sourcePages,
      text: textPages.join("\n").slice(0, 60000),
    };
  } finally {
    await task.destroy();
  }
}
