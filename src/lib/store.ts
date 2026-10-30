import { useSyncExternalStore } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import type { Role, Sujet } from "./data";
import { resolveAccountRole } from "./account-role";
import type { Correction } from "./grading";
import { firebaseAuth, firestore } from "./firebase";
import { localDayKey, type StudyDay } from "./streak";

export type Submission = {
  id: string;
  sujetId: string;
  studentName: string;
  studentEmail?: string;
  studentUid?: string;
  teacherUid?: string;
  delivery?: "online" | "offline";
  offlinePageCount?: number;
  answers: Record<string, string>;
  sentAt: string;
  correction?: Correction;
};
export type PublicTeacher = {
  uid: string;
  name: string;
  photo: string | null;
  levels: string[];
  subjects: string[];
};
export type State = {
  uid: string | null;
  role: Role | null;
  teacherApproved: boolean;
  user: { name: string; email: string; photo?: string | null } | null;
  teacher: { photo: string | null; first: string; last: string; levels: string[]; subjects: string[] } | null;
  teachers: PublicTeacher[];
  studentLevel: string;
  sujets: Sujet[];
  sujetsLoading: boolean;
  sujetsSyncError: boolean;
  submissions: Submission[];
  drafts: Record<string, Record<string, string>>;
  studyDays: StudyDay[];
};
export type OfflineAnswerPage = {
  id: string;
  exerciseId: string;
  pageNumber: number;
  imageData: string;
};

const initial: State = {
  uid: null,
  role: null,
  teacherApproved: false,
  user: null,
  teacher: null,
  teachers: [],
  studentLevel: "bac",
  sujets: [],
  sujetsLoading: false,
  sujetsSyncError: false,
  submissions: [],
  drafts: {},
  studyDays: [],
};

let state: State = initial;
let persistedState: State = initial;
let persistTimer: ReturnType<typeof setTimeout> | undefined;
let persistQueue = Promise.resolve();
const listeners = new Set<() => void>();
let sujetsUnsubscribe: (() => void) | undefined;
let sujetsWatchUid: string | undefined;

function stopSujetSync() {
  sujetsUnsubscribe?.();
  sujetsUnsubscribe = undefined;
  sujetsWatchUid = undefined;
}

function watchSujets(uid: string) {
  if (sujetsWatchUid === uid) return;
  stopSujetSync();
  sujetsWatchUid = uid;
  state = { ...state, sujetsLoading: true, sujetsSyncError: false };
  listeners.forEach((listener) => listener());
  sujetsUnsubscribe = onSnapshot(
    collection(firestore, "sujets"),
    (snapshot) => {
      if (state.uid !== uid || sujetsWatchUid !== uid) return;
      const sujets = snapshot.docs.map((item) => ({
        ...item.data() as Omit<Sujet, "id">,
        id: item.id,
      }));
      state = { ...state, sujets, sujetsLoading: false, sujetsSyncError: false };
      persistedState = { ...persistedState, sujets };
      listeners.forEach((listener) => listener());
    },
    (error) => {
      if (state.uid !== uid || sujetsWatchUid !== uid) return;
      console.error("Sujet live sync failed", error);
      state = { ...state, sujetsLoading: false, sujetsSyncError: true };
      listeners.forEach((listener) => listener());
    },
  );
}

export function refreshSujets() {
  if (state.uid) {
    sujetsWatchUid = undefined;
    watchSujets(state.uid);
  }
}

function same(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function setState(fn: (s: State) => Partial<State>) {
  state = { ...state, ...fn(state) };
  if (!state.uid && state.role && typeof window !== "undefined") {
    localStorage.setItem("7ellha-role", state.role);
  }
  listeners.forEach((listener) => listener());
  if (state.uid) {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      const latest = state;
      void commitSnapshot(latest).catch((error) => console.error("Firestore sync failed", error));
    }, 300);
  }
}

async function commitSnapshot(snapshot: State) {
  const operation = persistQueue.then(async () => {
    await persistChanges(persistedState, snapshot);
    persistedState = snapshot;
  });
  persistQueue = operation.catch((error) => console.error("Firestore sync failed", error));
  return operation;
}

export async function flushStore() {
  clearTimeout(persistTimer);
  if (state.uid) await commitSnapshot(state);
}

export function getState() { return state; }

export async function saveOfflineAnswerPages(submissionId: string, pages: OfflineAnswerPage[]) {
  const uid = state.uid;
  if (!uid) throw new Error("يجب تسجيل الدخول قبل إرسال الصور");
  if (pages.reduce((total, page) => total + page.imageData.length, 0) > 8_000_000) {
    throw new Error("إجمالي الصور كبير جداً. أرسل صفحات أقل أو التقط صوراً أوضح بحجم أصغر.");
  }
  const batch = writeBatch(firestore);
  for (const page of pages) {
    if (page.imageData.length > 850_000) throw new Error("إحدى الصور أكبر من الحد المسموح");
    batch.set(doc(firestore, "submissions", submissionId, "offlinePages", page.id), {
      studentUid: uid,
      exerciseId: page.exerciseId,
      pageNumber: page.pageNumber,
      imageData: page.imageData,
      createdAt: new Date().toISOString(),
    });
  }
  if (pages.length) await batch.commit();
}

export async function saveOfflineDraftPages(sujetId: string, pages: OfflineAnswerPage[]) {
  const uid = state.uid;
  if (!uid) throw new Error("يجب تسجيل الدخول لحفظ مسودة الصور");
  const batch = writeBatch(firestore);
  batch.set(doc(firestore, "users", uid, "offlineDrafts", sujetId), { updatedAt: serverTimestamp() }, { merge: true });
  for (const page of pages) {
    if (page.imageData.length > 850_000) throw new Error("إحدى الصور أكبر من الحد المسموح");
    batch.set(doc(firestore, "users", uid, "offlineDrafts", sujetId, "pages", page.id), {
      exerciseId: page.exerciseId,
      pageNumber: page.pageNumber,
      imageData: page.imageData,
    });
  }
  if (pages.length) await batch.commit();
}

export type SujetSourcePage = {
  pageNumber: number;
  imageData: string;
};

export async function saveSujetSourcePages(sujetId: string, pages: string[]) {
  const uid = state.uid;
  if (!uid) throw new Error("يجب تسجيل الدخول لحفظ صفحات الموضوع");
  if (!sujetId || pages.length > 40 || pages.reduce((total, page) => total + page.length, 0) > 34_000_000) {
    throw new Error("عدد صفحات الموضوع أو حجمها أكبر من الحد المسموح");
  }

  pages.forEach((imageData) => {
    if (
      imageData.length > 850_000
      || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(imageData)
    ) {
      throw new Error("تعذّر حفظ صورة إحدى الصفحات بالحجم أو الصيغة المطلوبة");
    }
  });
  for (let offset = 0; offset < pages.length; offset += 8) {
    const batch = writeBatch(firestore);
    pages.slice(offset, offset + 8).forEach((imageData, index) => {
      const pageNumber = offset + index + 1;
      batch.set(doc(firestore, "sujets", sujetId, "sourcePages", String(pageNumber).padStart(2, "0")), {
        pageNumber,
        imageData,
      });
    });
    await batch.commit();
  }
}

export async function getSujetSourcePages(sujetId: string): Promise<SujetSourcePage[]> {
  if (!state.uid) throw new Error("سجّل الدخول لعرض صفحات الموضوع");
  const snapshot = await getDocs(collection(firestore, "sujets", sujetId, "sourcePages"));
  return snapshot.docs
    .map((item) => ({
      pageNumber: Number(item.data()["pageNumber"] ?? 0),
      imageData: String(item.data()["imageData"] ?? ""),
    }))
    .filter((page) => page.pageNumber > 0 && page.imageData.startsWith("data:image/jpeg;base64,"))
    .sort((a, b) => a.pageNumber - b.pageNumber);
}

export async function deleteSujetSourcePages(sujetId: string) {
  if (!state.uid) throw new Error("سجّل الدخول لحذف صفحات الموضوع");
  const snapshot = await getDocs(collection(firestore, "sujets", sujetId, "sourcePages"));
  for (let offset = 0; offset < snapshot.docs.length; offset += 450) {
    const batch = writeBatch(firestore);
    snapshot.docs.slice(offset, offset + 450).forEach((item) => batch.delete(item.ref));
    await batch.commit();
  }
}

export async function getOfflineDraftPages(sujetId: string): Promise<OfflineAnswerPage[]> {
  const uid = state.uid;
  if (!uid) return [];
  const snapshot = await getDocs(collection(firestore, "users", uid, "offlineDrafts", sujetId, "pages"));
  return snapshot.docs.map((item) => ({
    id: item.id,
    exerciseId: String(item.data()["exerciseId"] ?? ""),
    pageNumber: Number(item.data()["pageNumber"] ?? 0),
    imageData: String(item.data()["imageData"] ?? ""),
  })).sort((a, b) => a.pageNumber - b.pageNumber);
}

export async function deleteOfflineDraftPages(sujetId: string) {
  const uid = state.uid;
  if (!uid) return;
  const snapshot = await getDocs(collection(firestore, "users", uid, "offlineDrafts", sujetId, "pages"));
  const batch = writeBatch(firestore);
  snapshot.docs.forEach((item) => batch.delete(item.ref));
  batch.delete(doc(firestore, "users", uid, "offlineDrafts", sujetId));
  await batch.commit();
}

export async function deleteOfflineDraftPage(sujetId: string, pageId: string) {
  const uid = state.uid;
  if (!uid) return;
  await deleteDoc(doc(firestore, "users", uid, "offlineDrafts", sujetId, "pages", pageId));
}

export async function getOfflineAnswerPages(submissionId: string): Promise<OfflineAnswerPage[]> {
  const snapshot = await getDocs(collection(firestore, "submissions", submissionId, "offlinePages"));
  return snapshot.docs
    .map((item) => ({
      id: item.id,
      exerciseId: String(item.data()["exerciseId"] ?? ""),
      pageNumber: Number(item.data()["pageNumber"] ?? 0),
      imageData: String(item.data()["imageData"] ?? ""),
    }))
    .sort((a, b) => a.pageNumber - b.pageNumber);
}

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (callback) => { listeners.add(callback); return () => listeners.delete(callback); },
    () => sel(state),
    () => sel(initial),
  );
}

export async function recordStudyActivity(sujetId: string, questionId?: string) {
  const uid = state.uid;
  if (!uid) return;

  const day = localDayKey();
  const existing = state.studyDays.find((entry) => entry.day === day);
  const addSujet = !existing?.sujetIds.includes(sujetId);
  const addQuestion = !!questionId && !existing?.questionIds.includes(questionId);
  if (!addSujet && !addQuestion) return;

  const studyDay: StudyDay = {
    day,
    questionIds: [...new Set([...(existing?.questionIds ?? []), ...(questionId ? [questionId] : [])])],
    sujetIds: [...new Set([...(existing?.sujetIds ?? []), sujetId])],
  };
  if (!existing || studyDay.questionIds.length !== existing.questionIds.length || studyDay.sujetIds.length !== existing.sujetIds.length) {
    state = {
      ...state,
      studyDays: [...state.studyDays.filter((entry) => entry.day !== day), studyDay],
    };
    listeners.forEach((listener) => listener());
  }

  await setDoc(doc(firestore, "users", uid, "activity", day), {
    day,
    ...(addQuestion && questionId ? { questionIds: arrayUnion(questionId) } : {}),
    ...(addSujet ? { sujetIds: arrayUnion(sujetId) } : {}),
  }, { merge: true });
}

export async function hydrateUser(firebaseUser: FirebaseUser) {
  const userRef = doc(firestore, "users", firebaseUser.uid);
  const profileSnapshot = await getDoc(userRef).catch(() => null);
  const saved = profileSnapshot?.data();

  let teacherApproved = false;
  try {
    const approvalSnapshot = await getDoc(doc(firestore, "teacherAllowlist", firebaseUser.uid));
    teacherApproved = approvalSnapshot.data()?.["approved"] === true;
  } catch { /* ignore optional approval doc */ }

  const signupRole = typeof window === "undefined" ? null : sessionStorage.getItem("7ellha-signup-role");
  const selectedRole = typeof window === "undefined" ? null : localStorage.getItem("7ellha-role");
  const role = resolveAccountRole({
    savedRole: saved?.["role"],
    teacherRequested: saved?.["teacherRequested"],
    signupRole,
    selectedRole,
    teacherApproved,
  });
  const teacherRequested = role === "teacher";
  const user = {
    name: String(saved?.["name"] ?? firebaseUser.displayName ?? firebaseUser.email?.split("@")[0] ?? "مستخدم"),
    email: String(saved?.["email"] ?? firebaseUser.email ?? ""),
    photo: (saved?.["photo"] as string | null | undefined) ?? firebaseUser.photoURL,
  };
  const teacher = (saved?.["teacher"] as State["teacher"] | undefined) ?? null;
  const studentLevel = String(saved?.["studentLevel"] ?? "bac");

  if (!profileSnapshot?.exists() || saved?.["role"] !== role || saved?.["teacherRequested"] !== teacherRequested) {
    try {
      await setDoc(userRef, { role, teacherRequested: role === "teacher", name: user.name, email: user.email, photo: user.photo ?? null, teacher, studentLevel, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) { console.warn("User profile sync failed", e); }
  }
  if (role === "teacher" && teacher) {
    try {
      await setDoc(doc(firestore, "teacherDirectory", firebaseUser.uid), {
        uid: firebaseUser.uid,
        name: `أ. ${teacher.first} ${teacher.last}`.trim(),
        photo: teacher.photo,
        levels: teacher.levels,
        subjects: teacher.subjects,
      });
    } catch (error) {
      console.warn("Teacher directory sync failed", error);
    }
  }
  const teachers = await getDocs(collection(firestore, "teacherDirectory"))
    .then((snapshot) => snapshot.docs.map((item) => item.data() as PublicTeacher))
    .catch((error) => {
      console.warn("Teacher directory load failed", error);
      return [];
    });

  const submissions = await getDocs(query(
    collection(firestore, "submissions"),
    where(role === "teacher" ? "teacherUid" : "studentUid", "==", firebaseUser.uid),
  )).then((snapshot) => snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as Submission))
    .catch((e) => { console.warn("Submissions load failed", e); return []; });

  if (role === "teacher") {
    try {
      const corrections = await getDocs(collection(firestore, "users", firebaseUser.uid, "corrections"));
      const privateCorrections = new Map(corrections.docs.map((item) => [item.id, item.data()["correction"] as Correction]));
      for (const submission of submissions) {
        const draft = privateCorrections.get(submission.id);
        if (draft) submission.correction = draft;
      }
    } catch (e) { console.warn("Corrections load failed", e); }
  }
  const draftsSnapshot = await getDocs(collection(firestore, "users", firebaseUser.uid, "drafts")).catch(() => ({ docs: [] }));
  const drafts = Object.fromEntries(draftsSnapshot.docs.map((item) => [item.id, item.data()["answers"] as Record<string, string>]));
  let studyDays: StudyDay[] = [];
  try {
    const activitySnapshot = await getDocs(collection(firestore, "users", firebaseUser.uid, "activity"));
    studyDays = activitySnapshot.docs.map((item) => {
      const data = item.data();
      return {
        day: String(data["day"] ?? item.id),
        questionIds: Array.isArray(data["questionIds"]) ? data["questionIds"].filter((id): id is string => typeof id === "string") : [],
        sujetIds: Array.isArray(data["sujetIds"]) ? data["sujetIds"].filter((id): id is string => typeof id === "string") : [],
      };
    }).filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.day));
  } catch (error) {
    console.error("Study activity load failed", error);
  }
  if (role === "student") {
    const days = new Map(studyDays.map((entry) => [entry.day, entry]));
    const mergeDay = (day: string, questionIds: string[], sujetId: string) => {
      const previous = days.get(day);
      days.set(day, {
        day,
        questionIds: [...new Set([...(previous?.questionIds ?? []), ...questionIds])],
        sujetIds: [...new Set([...(previous?.sujetIds ?? []), sujetId])],
      });
    };
    for (const draft of draftsSnapshot.docs) {
      const data = draft.data();
      const updatedAt = data["updatedAt"];
      const answers = data["answers"] as Record<string, string> | undefined;
      if (typeof updatedAt?.toDate !== "function" || !answers) continue;
      const questionIds = Object.entries(answers).filter(([, answer]) => answer.trim()).map(([id]) => id);
      if (questionIds.length) mergeDay(localDayKey(updatedAt.toDate()), questionIds, draft.id);
    }
    for (const submission of submissions) {
      const day = submission.sentAt.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
      mergeDay(day, Object.entries(submission.answers).filter(([, answer]) => answer.trim()).map(([id]) => id), submission.sujetId);
    }
    studyDays = [...days.values()];
  }

  if (firebaseAuth?.currentUser?.uid !== firebaseUser.uid) return;

  const hasExistingSujets = state.uid === firebaseUser.uid;
  const existingSujets = hasExistingSujets ? state.sujets : [];
  state = {
    ...initial,
    uid: firebaseUser.uid,
    role,
    teacherApproved,
    user,
    teacher,
    teachers,
    studentLevel,
    sujets: existingSujets,
    sujetsLoading: hasExistingSujets ? state.sujetsLoading : true,
    sujetsSyncError: hasExistingSujets ? state.sujetsSyncError : false,
    submissions,
    drafts,
    studyDays,
  };
  persistedState = state;
  if (typeof window !== "undefined") {
    localStorage.removeItem("7ellha-role");
    sessionStorage.removeItem("7ellha-signup-role");
  }
  listeners.forEach((listener) => listener());
  watchSujets(firebaseUser.uid);
}

export function clearUserState() {
  stopSujetSync();
  clearTimeout(persistTimer);
  const selectedRole = typeof window === "undefined" ? null : localStorage.getItem("7ellha-role");
  state = { ...initial, role: selectedRole === "teacher" ? "teacher" : null, user: null };
  persistedState = state;
  listeners.forEach((listener) => listener());
}

async function persistChanges(previous: State, next: State) {
  const uid = next.uid;
  if (!uid) return;

  const profileBefore = { role: previous.role, user: previous.user, teacher: previous.teacher, studentLevel: previous.studentLevel };
  const profileAfter = { role: next.role, user: next.user, teacher: next.teacher, studentLevel: next.studentLevel };

  if (!same(profileBefore, profileAfter)) {
    await setDoc(doc(firestore, "users", uid), {
      role: next.role ?? "student",
      teacherRequested: next.role === "teacher",
      name: next.user?.name ?? "مستخدم",
      email: next.user?.email ?? "",
      photo: next.user?.photo ?? null,
      teacher: next.teacher,
      studentLevel: next.studentLevel,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  if (next.role === "teacher" && next.teacher && !same(previous.teacher, next.teacher)) {
    try {
      await setDoc(doc(firestore, "teacherDirectory", uid), {
        uid,
        name: `أ. ${next.teacher.first} ${next.teacher.last}`.trim(),
        photo: next.teacher.photo,
        levels: next.teacher.levels,
        subjects: next.teacher.subjects,
      });
    } catch (error) {
      console.warn("Teacher directory sync failed during persist", error);
    }
  }

  const batch = writeBatch(firestore);
  let writes = 0;

  const previousSujets = new Map(previous.sujets.map((sujet) => [sujet.id, sujet as Sujet & { ownerUid?: string }]));
  const nextSujets = new Map(next.sujets.map((sujet) => [sujet.id, sujet as Sujet & { ownerUid?: string }]));
  for (const [id, sujet] of nextSujets) {
    if (sujet.ownerUid === uid && !same(previousSujets.get(id), sujet)) {
      batch.set(doc(firestore, "sujets", id), { ...sujet, ownerUid: uid });
      writes++;
    }
  }
  for (const [id, sujet] of previousSujets) {
    if (sujet.ownerUid === uid && !nextSujets.has(id)) {
      const sourcePages = await getDocs(collection(firestore, "sujets", id, "sourcePages"));
      sourcePages.docs.forEach((page) => { batch.delete(page.ref); writes++; });
      batch.delete(doc(firestore, "sujets", id));
      writes++;
    }
  }

  const previousSubmissions = new Map(previous.submissions.map((submission) => [submission.id, submission]));
  const nextSubmissions = new Map(next.submissions.map((submission) => [submission.id, submission]));
  for (const [id, submission] of nextSubmissions) {
    const prior = previousSubmissions.get(id);
    if (!same(prior, submission)) {
      if (submission.studentUid === uid) {
        batch.set(doc(firestore, "submissions", id), submission);
        writes++;
      } else if (submission.teacherUid === uid && submission.correction) {
        if (submission.correction.publishedAt) {
          batch.set(doc(firestore, "submissions", id), submission);
          batch.delete(doc(firestore, "users", uid, "corrections", id));
        } else {
          batch.set(doc(firestore, "users", uid, "corrections", id), { correction: submission.correction, updatedAt: serverTimestamp() });
        }
        writes++;
      }
    }
  }
  for (const [id, submission] of previousSubmissions) {
    if ((submission.studentUid === uid || submission.teacherUid === uid) && !nextSubmissions.has(id)) {
      const offlinePages = await getDocs(collection(firestore, "submissions", id, "offlinePages")).catch(() => ({ docs: [] }));
      offlinePages.docs.forEach((page) => { batch.delete(page.ref); writes++; });
      batch.delete(doc(firestore, "submissions", id));
      writes++;
    }
  }

  for (const [sujetId, answers] of Object.entries(next.drafts)) {
    if (!same(previous.drafts[sujetId], answers)) {
      batch.set(doc(firestore, "users", uid, "drafts", sujetId), { answers, updatedAt: serverTimestamp() });
      writes++;
    }
  }
  for (const sujetId of Object.keys(previous.drafts)) {
    if (!(sujetId in next.drafts)) {
      batch.delete(doc(firestore, "users", uid, "drafts", sujetId));
      writes++;
    }
  }

  if (writes) {
    try {
      await batch.commit();
    } catch (error) {
      console.warn("Secondary batch persist failed", error);
    }
  }
}
