import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { SEED_SUJETS } from "@/lib/data";
import { localDayKey } from "@/lib/streak";

const state = vi.hoisted(() => ({
  user: { name: "Test Student", email: "student@example.test" },
  sujets: [] as unknown[],
  submissions: [] as unknown[],
  studyDays: [] as { day: string; questionIds: string[]; sujetIds: string[] }[],
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    img: ({ alt }: { alt?: string }) => <img alt={alt ?? ""} />,
  },
  useReducedMotion: () => true,
}));
vi.mock("@/components/AppShell", () => ({ Avatar: () => null }));
vi.mock("@/components/SujetCard", () => ({ SujetCard: () => null }));
vi.mock("@/lib/store", () => ({
  useStore: (select: (value: typeof state) => unknown) => select(state),
}));

import { ActivityPage } from "@/components/ActivityPages";

afterEach(() => {
  cleanup();
});

describe("student streak activity page", () => {
  it("shows encouragement, weekly activity, and subjects from the student's records", () => {
    state.sujets = SEED_SUJETS;
    state.studyDays = [
      {
        day: localDayKey(),
        questionIds: ["q1", "q2"],
        sujetIds: ["s1"],
      },
    ];
    const { container } = render(<ActivityPage kind="streak" />);

    expect(screen.getByText("أحسنت، أنجزت اليوم")).toBeTruthy();
    expect(screen.getByText("1 / 7 أيام نشطة")).toBeTruthy();
    expect(screen.getByText("اختبار الفصل الأول في الرياضيات")).toBeTruthy();
    expect(container.textContent).toContain("أسئلة عملت عليها");
    expect(container.textContent).toContain("كل خطوة تُحسب");
  });
});

describe("student points activity page", () => {
  it("shows a balance derived from saved activity and submissions, without a starter bonus", () => {
    state.sujets = [{ id: "exam-1", title: "موضوع الرياضيات", level: "bac", subject: "math" }];
    state.studyDays = [
      { day: "2026-10-21", questionIds: ["q1", "q2"], sujetIds: ["exam-1"] },
    ];
    state.submissions = [
      {
        id: "sub-1",
        sujetId: "exam-1",
        studentName: "Test Student",
        studentEmail: "student@example.test",
        answers: {},
        sentAt: "2026-10-22",
      },
    ];

    const { container } = render(<ActivityPage kind="points" />);

    expect(container.textContent).toContain("45");
    expect(container.textContent).toContain("+25");
    expect(container.textContent).not.toContain("340");
    expect(container.textContent).toContain("موضوع الرياضيات");
  });
});
