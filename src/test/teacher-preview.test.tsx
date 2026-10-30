import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { SEED_SUJETS } from "@/lib/data";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
  createFileRoute: () => (options: { component: () => ReactNode }) => ({ options, useParams: () => ({ id: "s2" }) }),
  useNavigate: () => vi.fn(),
}));
const state = vi.hoisted(() => ({ role: "teacher", sujets: [] as unknown[], drafts: {}, submissions: [] as unknown[] }));
vi.mock("@/lib/store", () => ({
  useStore: (select: (s: typeof state) => unknown) => select(state),
  setState: vi.fn(), getState: () => state,
}));
import { Route } from "@/routes/solve.$id";
import { setState } from "@/lib/store";

afterEach(cleanup);
describe("Teacher sujet viewing", () => {
  it("keeps teachers read-only even when they open a legacy answering URL", () => {
    state.sujets = SEED_SUJETS;
    const Component = Route.options.component;
    if (!Component) throw new Error("Missing solve page");
    const { container } = render(<Component />);
    expect(container.querySelectorAll("textarea, input, [contenteditable=true]")).toHaveLength(0);
    expect(setState).not.toHaveBeenCalled();
    expect(state.drafts).toEqual({});
    expect(state.submissions).toEqual([]);
  });

});