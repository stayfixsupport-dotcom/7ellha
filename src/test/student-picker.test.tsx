import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SEED_SUJETS } from "@/lib/data";

const navigation = vi.hoisted(() => vi.fn());
const state = vi.hoisted(() => ({
  user: { name: "Test Student", photo: undefined },
  studentLevel: "bac",
  sujets: [] as unknown[],
  drafts: {},
  submissions: [] as unknown[],
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
  createFileRoute: () => (options: { component: () => ReactNode }) => ({ options }),
  useNavigate: () => navigation,
}));
vi.mock("@/components/AppShell", () => ({
  AppShell: ({
    children,
    items = [],
    onNav = () => {},
  }: {
    children: ReactNode;
    items?: { id: string; label: string; icon: string }[];
    onNav?: (id: string) => void;
  }) => (
    <div>
      <nav>
        {items.map((item) => (
          <button key={item.id} onClick={() => onNav(item.id)}>
            {item.icon} {item.label}
          </button>
        ))}
      </nav>
      {children}
    </div>
  ),
  Avatar: () => null,
  Stat: () => null,
}));
vi.mock("@/components/SujetCard", () => ({
  SujetCard: ({ action }: { action: ReactNode }) => <article>{action}</article>,
  SujetCardSkeleton: () => null,
  SujetSyncNotice: () => null,
}));
vi.mock("@/components/ProfilePanel", () => ({ ProfilePanel: () => null }));
vi.mock("@/lib/grading", () => ({ studentSujets: (sujets: unknown[]) => sujets }));
vi.mock("@/lib/store", () => ({
  useStore: (select: (value: typeof state) => unknown) => select(state),
}));

import { Route } from "@/routes/student";
import { TeacherPicker } from "@/components/TeacherPicker";

afterEach(() => {
  cleanup();
  navigation.mockClear();
});

describe("Student method picker", () => {
  it("stays on the dashboard when closed and navigates only after a method is chosen", () => {
    state.sujets = SEED_SUJETS.filter((sujet) => sujet.level === "bac");
    const Component = Route.options.component;
    if (!Component) throw new Error("Missing student dashboard");
    render(<Component />);

    fireEvent.click(screen.getByRole("button", { name: /حلّ الموضوع/ }));
    expect(screen.getByRole("dialog", { name: "اختيار طريقة الحل" })).toBeTruthy();
    expect(navigation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "إغلاق" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(navigation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /حلّ الموضوع/ }));
    fireEvent.click(screen.getByRole("button", { name: "حل عبر الإنترنت" }));
    expect(navigation).toHaveBeenLastCalledWith({ to: "/solve/$id", params: { id: "s1" } });

    fireEvent.click(screen.getByRole("button", { name: "إغلاق" }));
    fireEvent.click(screen.getByRole("button", { name: /حلّ الموضوع/ }));
    fireEvent.click(screen.getByRole("button", { name: "حل على الورق" }));
    expect(navigation).toHaveBeenLastCalledWith({ to: "/offline/$id", params: { id: "s1" } });
  });

  it("opens scanning and exposes discovery source categories", async () => {
    state.sujets = SEED_SUJETS.filter((sujet) => sujet.level === "bac");
    const Component = Route.options.component;
    if (!Component) throw new Error("Missing student dashboard");
    render(<Component />);

    fireEvent.click(screen.getByRole("button", { name: /استكشف/ }));
    expect(await screen.findByRole("tab", { name: "من التلاميذ" })).toBeTruthy();
    expect(await screen.findByRole("tab", { name: "من الأساتذة" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /ماسح/ }));
    expect(screen.getByRole("heading", { name: "رفع موضوع" })).toBeTruthy();
  });

  it("only offers teachers who match the sujet level and subject", () => {
    const onSelect = vi.fn();
    render(
      <TeacherPicker
        teachers={[
          { uid: "teacher-1", name: "أ. سمير", photo: null, levels: ["bac"], subjects: ["math"] },
          { uid: "teacher-2", name: "أ. ليلى", photo: null, levels: ["2as"], subjects: ["math"] },
          {
            uid: "teacher-3",
            name: "أ. نادر",
            photo: null,
            levels: ["bac"],
            subjects: ["physics"],
          },
        ]}
        level="bac"
        subject="math"
        onSelect={onSelect}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /أ. سمير/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /أ. ليلى/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /أ. نادر/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /أ. سمير/ }));
    expect(onSelect).toHaveBeenCalledWith("teacher-1");
  });
});
