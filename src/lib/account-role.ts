import type { Role } from "./data";

export function resolveAccountRole({
  savedRole,
  teacherRequested,
  signupRole,
  selectedRole,
  teacherApproved,
}: {
  savedRole: unknown;
  teacherRequested: unknown;
  signupRole: string | null;
  selectedRole: string | null;
  teacherApproved: boolean;
}): Role {
  const request = teacherRequested === true
    || signupRole === "teacher"
    || (teacherRequested !== false && selectedRole === "teacher");
  return savedRole === "teacher" || teacherApproved || request ? "teacher" : "student";
}

export function dashboardRoute(role: Role, hasTeacherProfile: boolean): "/student" | "/teacher" | "/teacher-setup" {
  if (role === "teacher") return hasTeacherProfile ? "/teacher" : "/teacher-setup";
  return "/student";
}

export function postAuthRoute(
  role: Role,
  hasTeacherProfile: boolean,
  isSignup: boolean,
  isNewAccount: boolean,
): "/student" | "/teacher" | "/teacher-setup" | "/welcome" {
  return isSignup && isNewAccount ? "/welcome" : dashboardRoute(role, hasTeacherProfile);
}