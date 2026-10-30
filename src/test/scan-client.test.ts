import { describe, expect, it, vi } from "vitest";
import { mergeScanResults, retryScanRequest, splitScanPages } from "@/lib/scan-client";
import type { ScanResult } from "@/lib/scan.functions";

describe("scan request batching", () => {
  it("keeps image pages within Netlify's request size limits", () => {
    const batches = splitScanPages(Array.from({ length: 8 }, () => "x".repeat(850_000)));

    expect(batches.map((batch) => batch.length)).toEqual([3, 3, 2]);
    expect(
      batches.every((batch) => batch.reduce((size, page) => size + page.length, 0) <= 3_500_000),
    ).toBe(true);
  });

  it("starts a new request when a page would exceed the payload budget", () => {
    const batches = splitScanPages(["x".repeat(2_000_000), "y".repeat(1_600_000)]);

    expect(batches).toHaveLength(2);
    expect(batches[0]).toHaveLength(1);
    expect(batches[1]).toHaveLength(1);
  });

  it("merges exercises from all page-batch results", () => {
    const base: ScanResult = {
      title: "موضوع",
      level: "bac",
      subject: "math",
      duration: "ساعتان",
      year: 2026,
      confidence: 90,
      exercises: [{ title: "التمرين 1", context: "", questions: [{ text: "سؤال 1", points: 1 }] }],
    };
    const next: ScanResult = {
      ...base,
      exercises: [{ title: "التمرين 2", context: "", questions: [{ text: "سؤال 2", points: 2 }] }],
    };

    expect(mergeScanResults([base, next]).exercises.map((exercise) => exercise.title)).toEqual([
      "التمرين 1",
      "التمرين 2",
    ]);
  });

  it("retries a transient server request failure", async () => {
    const request = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("temporary network error"))
      .mockResolvedValue("success");

    vi.useFakeTimers();
    try {
      const result = retryScanRequest(request);
      await vi.runAllTimersAsync();
      await expect(result).resolves.toBe("success");
      expect(request).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
