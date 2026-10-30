import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SEED_SUJETS } from "@/lib/data";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
  createFileRoute: () => (options: { component: () => ReactNode }) => ({
    options,
    useParams: () => ({ id: "s2" }),
  }),
  useNavigate: () => vi.fn(),
}));

const state = vi.hoisted(() => ({
  sujets: [] as unknown[],
  user: { name: "Test Student", email: "student@example.test" },
}));
vi.mock("@/lib/store", () => ({
  useStore: (select: (value: typeof state) => unknown) => select(state),
  flushStore: vi.fn(),
  getState: () => ({ uid: "student-1" }),
  setState: vi.fn(),
  saveOfflineAnswerPages: vi.fn(),
  saveOfflineDraftPages: vi.fn(),
  getOfflineDraftPages: vi.fn().mockResolvedValue([]),
  getSujetSourcePages: vi.fn().mockResolvedValue([]),
  deleteOfflineDraftPage: vi.fn(),
  deleteOfflineDraftPages: vi.fn(),
}));

const pdfDelivery = vi.hoisted(() => ({ exportExamPdf: vi.fn(), downloadExamPdf: vi.fn() }));
vi.mock("@/lib/pdf", () => pdfDelivery);

import { Route } from "@/routes/offline.$id";
import { downloadExamPdf, exportExamPdf } from "@/lib/pdf";
import { getSujetSourcePages } from "@/lib/store";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Offline answer page", () => {
  it("downloads when preparation finishes, leaves uploads visible, and can reveal the sheet again", async () => {
    state.sujets = SEED_SUJETS;
    vi.mocked(exportExamPdf).mockResolvedValue(new Blob(["exam"], { type: "application/pdf" }));
    vi.mocked(downloadExamPdf).mockResolvedValue(undefined);
    const Component = Route.options.component;
    if (!Component) throw new Error("Missing offline answer page");
    const { container } = render(<Component />);
    const pdfSource = container.querySelector(".offline-pdf-source");
    expect(pdfSource?.querySelectorAll(".pdf-section")).toHaveLength(4);
    expect(pdfSource?.textContent).toContain("على التسلسل مع ناقل أومي");
    expect(pdfSource?.textContent).toContain("ارسم مخطط الدارة مع توجيه التيار.");
    expect(pdfSource?.querySelector(".offline-pdf-meta")).toBeNull();
    expect(pdfSource?.querySelectorAll(".offline-notebook")).toHaveLength(5);
    expect(pdfSource?.querySelectorAll(".offline-answer-page")).toHaveLength(3);
    expect(
      [...(pdfSource?.querySelectorAll(".offline-answer-page") ?? [])].map(
        (page) => page.querySelectorAll(".offline-answer-slot").length,
      ),
    ).toEqual([2, 2, 1]);
    expect(pdfSource?.querySelector(".offline-answer-page.is-solo")).not.toBeNull();
    expect(pdfSource?.textContent).toContain("(2 ن)");
    expect(pdfSource?.textContent).not.toContain("نقاط");

    fireEvent.click(screen.getByRole("button", { name: "تجهيز PDF" }));

    await waitFor(() => expect(downloadExamPdf).toHaveBeenCalledOnce());
    expect(downloadExamPdf).toHaveBeenCalledWith(
      expect.any(Blob),
      expect.stringContaining("ورقة-إجابة-s2"),
      { preferShare: false },
    );
    expect(container.textContent).toContain("أرسل إجاباتك المكتوبة");
    expect(container.querySelector(".offline-pdf-source")).toBeNull();
    expect(screen.queryByText(/اكتمل تجهيز ورقة الإجابة/)).toBeNull();

    const back = container.querySelector("a");
    const reveal = [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("إظهار ورقة الإجابة"),
    );
    if (!back) throw new Error("Missing back link");
    if (!reveal) throw new Error("Missing reveal button");
    expect(back.compareDocumentPosition(reveal) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(reveal);

    expect(container.textContent).toContain("فرض محروس: الظواهر الكهربائية");
    expect(container.querySelector(".offline-pdf-source")).not.toBeNull();
    expect(container.textContent).toContain("تنزيل PDF");

    fireEvent.click(screen.getByRole("button", { name: "تنزيل PDF" }));
    await waitFor(() => expect(downloadExamPdf).toHaveBeenCalledTimes(2));
    expect(downloadExamPdf).toHaveBeenNthCalledWith(
      2,
      expect.any(Blob),
      expect.stringContaining("ورقة-إجابة-s2"),
      { preferShare: false },
    );
  });

  it("puts saved original pages first and includes a marked answer area for every question", async () => {
    state.sujets = SEED_SUJETS.map((sujet) =>
      sujet.id === "s2" ? { ...sujet, sourcePageCount: 1 } : sujet,
    );
    vi.mocked(getSujetSourcePages).mockResolvedValue([
      { pageNumber: 1, imageData: "data:image/jpeg;base64,AA==" },
    ]);
    const Component = Route.options.component;
    if (!Component) throw new Error("Missing offline answer page");
    const { container } = render(<Component />);

    await waitFor(() => expect(getSujetSourcePages).toHaveBeenCalledWith("s2"));
    const pdfSource = container.querySelector(".offline-pdf-source");
    expect(pdfSource?.querySelector(".source-exam-page img")).toHaveAttribute(
      "alt",
      "صفحة 1 من الموضوع الأصلي",
    );
    expect(pdfSource?.querySelectorAll(".offline-notebook")).toHaveLength(5);
    expect(pdfSource?.textContent).toContain("(2 ن)");
    expect(pdfSource?.querySelectorAll(".offline-answer-page")).toHaveLength(3);
  });
});
