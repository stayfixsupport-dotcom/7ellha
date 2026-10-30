import type { ScanResult } from "@/lib/scan.functions";

const MAX_PAGES_PER_REQUEST = 3;
const MAX_PAGE_DATA_LENGTH_PER_REQUEST = 3_500_000;

export function splitScanPages(pages: string[]) {
  const batches: string[][] = [];
  let batch: string[] = [];
  let batchLength = 0;

  for (const page of pages) {
    if (page.length > MAX_PAGE_DATA_LENGTH_PER_REQUEST) {
      throw new Error("حجم صفحة المسح أكبر من الحد المسموح");
    }

    if (
      batch.length >= MAX_PAGES_PER_REQUEST ||
      batchLength + page.length > MAX_PAGE_DATA_LENGTH_PER_REQUEST
    ) {
      batches.push(batch);
      batch = [];
      batchLength = 0;
    }

    batch.push(page);
    batchLength += page.length;
  }

  if (batch.length) batches.push(batch);
  return batches;
}

export function mergeScanResults(results: ScanResult[]) {
  const first = results[0];
  if (!first) throw new Error("لم يُرجع التحليل أي نتائج");
  const exercises = results.flatMap((result) => result.exercises);
  if (exercises.length > 50)
    throw new Error("تعذّر دمج النتائج: الملف يحتوي على تمارين أكثر من الحد المسموح");
  return {
    ...first,
    exercises,
  };
}

export async function retryScanRequest<T>(request: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 700 * 2 ** attempt));
      }
    }
  }
  throw new Error(
    "تعذّر الوصول إلى خادم التحليل بعد محاولات تلقائية. تحقق من اتصال الإنترنت ثم أعد المحاولة.",
    { cause: lastError },
  );
}
