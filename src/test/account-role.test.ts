import { describe, expect, it } from "vitest";
import { dashboardRoute, postAuthRoute, resolveAccountRole } from "@/lib/account-role";

describe("account role resolution", () => {
  it("sends returning accounts directly to their role dashboard", () => {
    expect(dashboardRoute("student", false)).toBe("/student");
    expect(dashboardRoute("teacher", true)).toBe("/teacher");
    expect(dashboardRoute("teacher", false)).toBe("/teacher-setup");
  });

  it("sends only genuinely new signups through onboarding", () => {
    expect(postAuthRoute("student", false, true, true)).toBe("/welcome");
    expect(postAuthRoute("teacher", false, true, false)).toBe("/teacher-setup");
    expect(postAuthRoute("student", false, false, true)).toBe("/student");
  });

  it("preserves a teacher signup while the auth listener sees a student-shaped profile", () => {
    expect(resolveAccountRole({
      savedRole: "student",
      teacherRequested: false,
      signupRole: "teacher",
      selectedRole: "teacher",
      teacherApproved: false,
    })).toBe("teacher");
  });

  it("repairs older teacher requests that were saved as students", () => {
    expect(resolveAccountRole({
      savedRole: "student",
      teacherRequested: undefined,
      signupRole: null,
      selectedRole: "teacher",
      teacherApproved: false,
    })).toBe("teacher");
  });

  it("does not let a stale teacher selection override an explicit student profile", () => {
    expect(resolveAccountRole({
      savedRole: "student",
      teacherRequested: false,
      signupRole: null,
      selectedRole: "teacher",
      teacherApproved: false,
    })).toBe("student");
  });

  it("uses approval as a teacher role even if the profile is incomplete", () => {
    expect(resolveAccountRole({
      savedRole: undefined,
      teacherRequested: false,
      signupRole: null,
      selectedRole: null,
      teacherApproved: true,
    })).toBe("teacher");
  });
});