import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  deleteUser,
} from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, setDoc, where, writeBatch } from "firebase/firestore";
import type { Role } from "./data";
import { ensureLocalAuthPersistence, firebaseAuth, firestore } from "./firebase";
import { clearUserState, flushStore, getState, hydrateUser } from "./store";

function requireAuth() {
  if (!firebaseAuth) throw new Error("Firebase Authentication is unavailable in this environment.");
  return firebaseAuth;
}

async function requirePersistentAuth() {
  const auth = requireAuth();
  await ensureLocalAuthPersistence();
  return auth;
}

export async function registerWithEmail(name: string, email: string, password: string, role: Role, level: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("7ellha-role", role);
    sessionStorage.setItem("7ellha-signup-role", role);
  }
  try {
    const credential = await createUserWithEmailAndPassword(await requirePersistentAuth(), email, password);
    await updateProfile(credential.user, { displayName: name });
    await setDoc(doc(firestore, "users", credential.user.uid), {
      role,
      teacherRequested: role === "teacher",
      name,
      email: credential.user.email,
      photo: null,
      teacher: null,
      studentLevel: level,
      updatedAt: new Date().toISOString(),
    });
  } finally {
    if (typeof window !== "undefined") sessionStorage.removeItem("7ellha-signup-role");
  }
  const user = requireAuth().currentUser;
  if (!user) throw new Error("auth/internal-error");
  await hydrateUser(user);
  return user;
}

export async function loginWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(await requirePersistentAuth(), email, password);
  await hydrateUser(credential.user);
  return credential.user;
}

export async function loginWithGoogle(role: Role, level: string, isSignup = false) {
  if (isSignup && typeof window !== "undefined") {
    localStorage.setItem("7ellha-role", role);
    sessionStorage.setItem("7ellha-signup-role", role);
  }
  try {
    const credential = await signInWithPopup(await requirePersistentAuth(), new GoogleAuthProvider());
    const profileRef = doc(firestore, "users", credential.user.uid);
    const profile = await getDoc(profileRef);
    if (!profile.exists()) {
      await setDoc(profileRef, {
        role,
        teacherRequested: role === "teacher",
        name: credential.user.displayName ?? "مستخدم",
        email: credential.user.email ?? "",
        photo: credential.user.photoURL,
        teacher: null,
        studentLevel: level,
        updatedAt: new Date().toISOString(),
      });
    }
    await hydrateUser(credential.user);
    return { user: credential.user, isNewAccount: !profile.exists() };
  } finally {
    if (isSignup && typeof window !== "undefined") sessionStorage.removeItem("7ellha-signup-role");
  }
}

export async function logout() {
  await requireAuth().signOut();
  clearUserState();
}

export async function deleteCurrentAccount(typedName: string, password: string) {
  const auth = requireAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("لا يوجد حساب مسجل حالياً");
  const expectedName = getState().user?.name ?? user.displayName ?? "";
  if (typedName.trim() !== expectedName.trim()) throw new Error("الاسم المكتوب لا يطابق اسم الحساب");
  await flushStore();

  const providers = user.providerData.map((provider) => provider.providerId);
  if (providers.includes("password")) {
    if (!user.email || !password) throw new Error("أدخل كلمة المرور لتأكيد هويتك");
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  } else if (providers.includes("google.com")) {
    await reauthenticateWithPopup(user, new GoogleAuthProvider());
  }

  const uid = user.uid;
  const [sujets, studentSubmissions, teacherSubmissions, drafts, corrections, teacherDirectory, offlineDrafts] = await Promise.all([
    getDocs(query(collection(firestore, "sujets"), where("ownerUid", "==", uid))),
    getDocs(query(collection(firestore, "submissions"), where("studentUid", "==", uid))),
    getDocs(query(collection(firestore, "submissions"), where("teacherUid", "==", uid))),
    getDocs(collection(firestore, "users", uid, "drafts")),
    getDocs(collection(firestore, "users", uid, "corrections")),
    getDocs(collection(firestore, "teacherDirectory")),
    getDocs(collection(firestore, "users", uid, "offlineDrafts")),
  ]);
  const allowlistRef = doc(firestore, "teacherAllowlist", uid);
  const allowlistSnapshot = await getDoc(allowlistRef);
  const removals = new Map<string, ReturnType<typeof doc>>();
  sujets.docs.forEach((item) => removals.set(`sujets/${item.id}`, item.ref));
  studentSubmissions.docs.forEach((item) => removals.set(`submissions/${item.id}`, item.ref));
  teacherSubmissions.docs.forEach((item) => removals.set(`submissions/${item.id}`, item.ref));
  drafts.docs.forEach((item) => removals.set(`users/${uid}/drafts/${item.id}`, item.ref));
  corrections.docs.forEach((item) => removals.set(`users/${uid}/corrections/${item.id}`, item.ref));
  teacherDirectory.docs.filter((item) => item.id === uid).forEach((item) => removals.set(`teacherDirectory/${item.id}`, item.ref));
  offlineDrafts.docs.forEach((item) => removals.set(`users/${uid}/offlineDrafts/${item.id}`, item.ref));
  const offlineDraftPages = await Promise.all(offlineDrafts.docs.map((item) => getDocs(collection(firestore, "users", uid, "offlineDrafts", item.id, "pages"))));
  offlineDraftPages.flatMap((snapshot) => snapshot.docs).forEach((item) => removals.set(`users/${uid}/offlineDrafts/${item.ref.parent.parent?.id}/pages/${item.id}`, item.ref));
  const submissionDocs = new Map([...studentSubmissions.docs, ...teacherSubmissions.docs].map((item) => [item.id, item]));
  const offlinePages = await Promise.all([...submissionDocs.values()].map((item) => getDocs(collection(firestore, "submissions", item.id, "offlinePages"))));
  offlinePages.flatMap((snapshot) => snapshot.docs).forEach((item) => removals.set(`submissions/${item.ref.parent.parent?.id}/offlinePages/${item.id}`, item.ref));
  const refs = [...removals.values(), doc(firestore, "users", uid), ...(allowlistSnapshot.exists() ? [allowlistRef] : [])];
  for (let offset = 0; offset < refs.length; offset += 450) {
    const batch = writeBatch(firestore);
    refs.slice(offset, offset + 450).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }

  await deleteUser(user);
}

const FIREBASE_ERROR_CODES: Record<string, string> = {
  // Auth
  "auth/email-already-in-use": "هذا البريد مسجل من قبل. سجّل الدخول بدلاَ من ذلك.",
  "auth/invalid-email": "صيغة البريد الإلكتروني غير صحيحة.",
  "auth/weak-password": "كلمة السر يجب أن تكون 6 أحرف على الأقل.",
  "auth/wrong-password": "كلمة السر غير صحيحة.",
  "auth/user-not-found": "هذا الحساب غير موجود.",
  "auth/invalid-credential": "البريد أو كلمة السر غير صحيحة.",
  "auth/popup-closed-by-user": "أُغلقت نافذة Google قبل اكتمال الدخول.",
  "auth/requires-recent-login": "انتهت صلاحية تأكيد الهوية. سجّل الدخول مجدداً ثم أعد المحاولة.",
  "auth/network-request-failed": "تعذّر الاتصال بالخدمة. تحقق من اتصال الإنترنت وحاول مجدداً.",
  "auth/internal-error": "حدث خطأ أثناء التحقق. حاول مجدداً بعد لحظات.",
  "auth/invalid-api-key": "إعدادات التطبيق غير مكتملة. تواصل مع الإدارة.",
  "auth/unauthorized-domain": "هذه الصفحة غير مصرح لها. تواصل مع الإدارة.",
  "auth/configuration-not-found": "تكوين التطبيق ناقص. تواصل مع الإدارة.",
  "auth/unsupported-persistence-type": "هذا المتصفح لا يدعم حفظ جلسة الدخول. جرّب متصفحاً آخر أو فعّل التخزين المحلي.",
  "auth/persistence-unavailable": "تعذّر حفظ جلسة الدخول على هذا الجهاز. فعّل ملفات تعريف الارتباط والتخزين المحلي ثم حاول مجدداً.",
  "auth/too-many-requests": "محاولات كثيرة جداً. انتظر دقيقة وحاول مجدداً.",
  "auth/user-disabled": "تم تعطيل هذا الحساب. تواصل مع الإدارة.",
  // Firestore / general
  "failed-precondition": "تعذّر حفظ بياناتك. تحقق من اتصال الإنترنت وحاول مجدداً.",
  "permission-denied": "ليس لديك صلاحية لإتمام هذه العملية.",
  "unavailable": "الخدمة غير متاحة حالياً. حاول مجدداً بعد لحظات.",
};

export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code && FIREBASE_ERROR_CODES[code]) return FIREBASE_ERROR_CODES[code];
  return "تعذّر إتمام العملية. تحقق من اتصال الإنترنت وحاول مجدداً.";
}