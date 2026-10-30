import { getApp, getApps, initializeApp } from "firebase/app";
import { browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env["VITE_FIREBASE_API_KEY"],
  authDomain: import.meta.env["VITE_FIREBASE_AUTH_DOMAIN"],
  projectId: import.meta.env["VITE_FIREBASE_PROJECT_ID"],
  storageBucket: import.meta.env["VITE_FIREBASE_STORAGE_BUCKET"],
  messagingSenderId: import.meta.env["VITE_FIREBASE_MESSAGING_SENDER_ID"],
  appId: import.meta.env["VITE_FIREBASE_APP_ID"],
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = typeof window === "undefined" ? null : getAuth(firebaseApp);
let authPersistencePromise: Promise<void> | undefined;

export function ensureLocalAuthPersistence() {
  if (!firebaseAuth) return Promise.reject(new Error("Firebase Authentication is unavailable in this environment."));
  authPersistencePromise ??= setPersistence(firebaseAuth, browserLocalPersistence);
  return authPersistencePromise;
}

type FirestoreWindow = Window & { __7ellhaFirestore?: Firestore };
const browserWindow = typeof window === "undefined" ? null : window as FirestoreWindow;

function browserFirestore() {
  try {
    return initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (error) {
    console.warn("Persistent Firestore cache unavailable; using the default cache", error);
    return getFirestore(firebaseApp);
  }
}

export const firestore = browserWindow
  ? browserWindow.__7ellhaFirestore ??= browserFirestore()
  : getFirestore(firebaseApp);