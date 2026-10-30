import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { NavigationProgress } from '@/components/NavigationProgress';
import { MobileKeyboard } from '@/components/MobileKeyboard';
import { onAuthStateChanged } from "firebase/auth";
import { ensureLocalAuthPersistence, firebaseAuth } from "@/lib/firebase";
import { clearUserState, hydrateUser, useStore } from "@/lib/store";
import { dashboardRoute } from "@/lib/account-role";
import { configuredSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl text-foreground">404</h1>
        <h2 className="mt-4 text-2xl text-foreground">الصفحة غير موجودة</h2>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl text-foreground">تعذّر تحميل الصفحة</h1>
        <p className="mt-2 text-sm text-muted-foreground">حدث خطأ ما. حاول مجدداً.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground"
          >
            حاول مجدداً
          </button>
          <a href="/" className="rounded-xl border border-input bg-background px-4 py-2 font-bold text-foreground">
            الرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => {
    const siteUrl = configuredSiteUrl();
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
        { name: "theme-color", content: "#0b3b33" },
        { title: "حلّها 7ellha — منصة جزائرية للسوجيات والمواضيع التعليمية" },
        { name: "description", content: SITE_DESCRIPTION },
        { name: "author", content: "7ellha" },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: SITE_NAME },
        { property: "og:locale", content: "ar_DZ" },
        { property: "og:description", content: SITE_DESCRIPTION },
        { name: "twitter:card", content: "summary_large_image" },
        { "script:ld+json": {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "حلّها",
          alternateName: ["7ellha", "Hellha", "hellha", "حلها"],
          description: SITE_DESCRIPTION,
          inLanguage: "ar-DZ",
          ...(siteUrl ? { url: siteUrl } : {}),
        } },
      ],
      links: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Lalezar&display=swap" },
        { rel: "stylesheet", href: appCss },
        { rel: "icon", href: "/favicon.png", type: "image/png" },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar-DZ" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const uid = useStore((state) => state.uid);
  const role = useStore((state) => state.role);
  const teacher = useStore((state) => state.teacher);
  const [authStatus, setAuthStatus] = useState<"checking" | "ready" | "error">("checking");

  useEffect(() => {
    const auth = firebaseAuth;
    if (!auth) {
      setAuthStatus("error");
      return;
    }
    let authGeneration = 0;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void ensureLocalAuthPersistence().then(() => {
      if (!active) return;
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        const generation = ++authGeneration;
        if (!user) {
          clearUserState();
          setAuthStatus("ready");
          return;
        }
        setAuthStatus("checking");
        try {
          await hydrateUser(user);
          if (active && generation === authGeneration) setAuthStatus("ready");
        } catch (error) {
          console.error("الحساب account hydration failed", error);
          if (active && generation === authGeneration) setAuthStatus("error");
        }
      });
    }).catch((error: unknown) => {
      console.error("Firebase Auth persistence setup failed", error);
      if (active) setAuthStatus("error");
    });
    return () => {
      active = false;
      authGeneration += 1;
      unsubscribe?.();
    };
  }, []);

  const publicRoute = pathname === "/" || pathname === "/auth";
  const teacherRoute = /^\/teacher(?:-|\/|$)/.test(pathname) || pathname.startsWith("/correct/") || pathname.startsWith("/preview/");
  const studentRoute = pathname === "/student" || pathname.startsWith("/student-") || pathname.startsWith("/solve/") || pathname.startsWith("/offline/");
  const roleAllowed = !(teacherRoute && role !== "teacher")
    && !(studentRoute && role !== "student");

  useEffect(() => {
    if (authStatus === "ready" && uid && publicRoute) {
      void router.navigate({ to: dashboardRoute(role ?? "student", !!teacher) });
    } else if (!publicRoute && authStatus === "ready" && !uid) {
      void router.navigate({ to: "/auth", search: { mode: "login" } });
    } else if (authStatus === "ready" && uid && !roleAllowed) {
      void router.navigate({ to: dashboardRoute(role ?? "student", !!teacher) });
    }
  }, [authStatus, pathname, publicRoute, role, roleAllowed, router, teacher, uid]);
  useEffect(() => {
    // Every button / link plays a cartoon "bloop".
    const h = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest("button, a, [role=button]");
      if (!el || (el as HTMLButtonElement).disabled) return;
      const kind = el.getAttribute("data-sfx");
      if (kind === "none") return;
      const back = kind === "back" || /^[→✕]$/.test((el.textContent ?? "").trim());
      void import("../lib/fx").then((m) => (back ? m.sfx.back() : m.sfx.tap()));
    };
    document.addEventListener("pointerdown", h, true);
    return () => document.removeEventListener("pointerdown", h, true);
  }, []);

  const blockedRoute = (authStatus === "checking" && pathname !== "/")
    || (!publicRoute && (authStatus !== "ready" || !uid || !roleAllowed))
    || (publicRoute && authStatus === "ready" && !!uid);

  return (
    <QueryClientProvider client={queryClient}>
      <MobileKeyboard />
      <NavigationProgress />
      {blockedRoute ? (
        <main className="grid min-h-svh place-items-center bg-cream px-5 text-center text-ink" dir="rtl">
          <section className="max-w-lg">
            {authStatus === "error" ? (
              <>
                <h1 className="text-3xl">تعذّر تحميل بيانات الحساب</h1>
                <p className="mt-3 text-base text-ink/70">تعذّر استعادة جلسة الدخول أو تحميل بياناتك. تحقق من اتصال الإنترنت وإعدادات التخزين في المتصفح، ثم أعد المحاولة.</p>
                <button onClick={() => window.location.reload()} className="mt-5 rounded-2xl border-2 border-ink bg-lime px-5 py-3 font-bold">إعادة المحاولة</button>
              </>
            ) : <p role="status" className="text-lg font-bold">جارٍ التحقق من الحساب…</p>}
          </section>
        </main>
      ) : <Outlet />}
    </QueryClientProvider>
  );
}
