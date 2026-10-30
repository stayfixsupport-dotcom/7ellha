import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Backdrop, Logo } from "@/components/brand";
import { FancyButton } from "@/components/ui/fancy-button";
import { sfx } from "@/lib/fx";
import { getState, useStore } from "@/lib/store";
import { authErrorMessage, loginWithEmail, loginWithGoogle, registerWithEmail } from "@/lib/firebase-auth";
import { postAuthRoute } from "@/lib/account-role";
import { LEVELS } from "@/lib/data";
import teacherImg from "@/assets/teacher.webp";
import studentImg from "@/assets/student.webp";

type Search = { mode: "signup" | "login" };
export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({ mode: s["mode"] === "signup" ? "signup" : "login" }),
  head: () => ({
    meta: [
      { title: "إنشاء حساب أو تسجيل الدخول — حلّها" },
      { name: "description", content: "أنشئ حسابك في حلّها كأستاذ أو تلميذ وابدأ رحلتك التعليمية." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "إنشاء حساب — حلّها" },
      { property: "og:description", content: "انضم إلى حلّها كأستاذ أو تلميذ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Auth,
});

const THEME = {
  teacher: { panel: "bg-teal", accent: "bg-teal", img: teacherImg, hi: "أهلاً أستاذ 👋", sub: "شارك مواضيعك مع آلاف التلاميذ عبر الوطن", chips: ["رفع بنقرة", "تصنيف ذكي", "تصحيح وطباعة"] },
  student: { panel: "bg-sun", accent: "bg-sun", img: studentImg, hi: "أهلاً يا بطل 🚀", sub: "آلاف المواضيع بانتظارك… حلّها واحدة تلو الأخرى", chips: ["حل تفاعلي", "نصائح فورية", "طباعة الحلول"] },
};

function Auth() {
  const { mode } = Route.useSearch();
  const nav = useNavigate();
  const role = useStore((s) => s.role) ?? (typeof window !== "undefined" && localStorage.getItem("7ellha-role") === "teacher" ? "teacher" : "student");
  const t = THEME[role];
  const [form, setForm] = useState({ name: "", email: "", pass: "", level: "bac" });
  const [typing, setTyping] = useState(0);
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isSignup = mode === "signup";

  const upd = (k: keyof typeof form, v: string) => { setForm((f) => ({ ...f, [k]: v })); setTyping((n) => n + 1); };

  const continueAfterAuth = (isNewAccount: boolean) => {
    const current = getState();
    nav({ to: postAuthRoute(current.role ?? "student", !!current.teacher, isSignup, isNewAccount) });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const bad = isSignup && form.name.trim().length < 2 ? "الاسم يجب أن يحتوي على حرفين على الأقل"
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? "البريد الإلكتروني غير صحيح، يجب أن يحتوي على @ مثل name@mail.com"
      : form.pass.length < 6 ? "كلمة السر يجب أن تحتوي على 6 أحرف على الأقل" : "";
    if (bad) { sfx.error(); setErr(bad); return; }
    setSubmitting(true);
    setErr("");
    let isNewAccount = isSignup;
    try {
      if (isSignup) {
        try {
          await registerWithEmail(form.name.trim(), form.email.trim(), form.pass, role, form.level);
        } catch (error) {
          if ((error as { code?: string })?.code !== "auth/email-already-in-use") throw error;
          isNewAccount = false;
          await loginWithEmail(form.email.trim(), form.pass);
        }
      } else {
        await loginWithEmail(form.email.trim(), form.pass);
        isNewAccount = false;
      }
      sfx.success();
      continueAfterAuth(isNewAccount);
    } catch (error) {
      console.error("Auth error:", error);
      sfx.error();
      setErr(authErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const googleLogin = async () => {
    setSubmitting(true);
    setErr("");
    try {
      const { isNewAccount } = await loginWithGoogle(role, form.level, isSignup);
      sfx.success();
      continueAfterAuth(isNewAccount);
    } catch (error) {
      console.error("Google auth error:", error);
      sfx.error();
      setErr(authErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative grid h-[100svh] overflow-hidden bg-cream lg:grid-cols-2">
      {/* Form */}
      <section className="relative flex items-center justify-center overflow-y-auto px-5 py-2 text-ink">
        <Backdrop />
        <motion.div layout className="relative z-10 my-auto w-full max-w-md">
          <div className="relative mb-1 flex items-center justify-center">
            <button type="button" data-sfx="back" aria-label="رجوع" onClick={() => nav({ to: "/" })} className="absolute right-0 grid h-10 w-10 place-items-center rounded-full border-2 border-ink/15 bg-paper text-xl font-bold">→</button>
            <Logo bounce className="w-[min(46vw,11rem)] sm:w-[min(32vw,15rem)]" />
          </div>

          <AnimatePresence mode="wait">
            <motion.h1 key={mode + role} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="text-3xl sm:text-4xl">
              {isSignup ? (role === "teacher" ? "انضم كأستاذ" : "أنشئ حسابك") : "مرحباً بعودتك"}
            </motion.h1>
          </AnimatePresence>
          <p className="mt-1 text-sm text-ink/60">{isSignup ? "دقيقة واحدة وتكون جاهزاً ✨" : "واصل من حيث توقفت"}</p>

          <form noValidate onSubmit={submit} className="mt-2 space-y-1.5">
            <AnimatePresence>
              {isSignup && <Field key="n" label="الاسم الكامل" value={form.name} onChange={(v) => upd("name", v)} icon="🙂" />}
            </AnimatePresence>
            <Field label="البريد الإلكتروني" type="email" value={form.email} onChange={(v) => upd("email", v)} icon="✉️" />
            <Field label="كلمة السر" type="password" value={form.pass} onChange={(v) => upd("pass", v)} icon="🔒" />
            {isSignup && role === "student" && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="overflow-hidden">
                <p className="mb-2 text-sm font-bold text-ink/60">مستواك الدراسي</p>
                <div className="grid grid-cols-4 gap-2">
                  {LEVELS.map((l) => (
                    <button type="button" key={l.id} onClick={() => upd("level", l.id)}
                      className={`rounded-xl border-2 py-2 text-sm font-bold transition-all ${form.level === l.id ? "scale-105 border-sun bg-sun text-ink" : "border-ink/15 text-ink/70"}`}>{l.short}</button>
                  ))}
                </div>
              </motion.div>
            )}
            {err && <motion.p initial={{ x: -10 }} animate={{ x: [0, -8, 8, 0] }} className="rounded-xl bg-coral/20 px-3 py-2 text-sm text-coral">{err}</motion.p>}
            <FancyButton data-sfx="none" type="submit" disabled={submitting} variant={role === "teacher" ? "lime" : "sun"} className="w-full text-lg">{submitting ? "جارٍ التحقق…" : isSignup ? "إنشاء الحساب" : "دخول"} ←</FancyButton>
            <div className="flex items-center gap-3 text-xs text-ink/50"><span className="h-px flex-1 bg-ink/15" />أو<span className="h-px flex-1 bg-ink/15" /></div>
            <FancyButton data-sfx="none" type="button" disabled={submitting} variant="outline" className="w-full text-lg" onClick={() => void googleLogin()}>
              <span className="inline-flex items-center justify-center gap-3">
                <svg viewBox="0 0 48 48" className="h-6 w-6" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
                المتابعة مع Google
              </span>
            </FancyButton>
          </form>
          <p className="mt-2 text-center text-sm text-ink/60">
            {isSignup ? "لديك حساب؟ " : "جديد في حلّها؟ "}
            <button className="font-bold text-forest underline" onClick={() => nav({ to: "/auth", search: { mode: isSignup ? "login" : "signup" } })}>{isSignup ? "سجّل الدخول" : "أنشئ حساباً"}</button>
          </p>
        </motion.div>
      </section>
      {/* Illustration panel (desktop, appears on the left in RTL) */}
      <aside className={`relative hidden overflow-hidden border-r-2 border-ink lg:flex lg:flex-col lg:items-center lg:justify-center ${t.panel} p-10 transition-colors duration-500`}>
        <div className="absolute -top-20 -right-20 h-80 w-80 animate-blob bg-paper/30" />
        <div className="absolute -bottom-24 -left-16 h-96 w-96 animate-blob bg-lime/40" />
        <AnimatePresence mode="wait">
          <motion.div key={role} initial={{ opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -30, scale: 0.9 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="relative z-10 flex flex-col items-center text-center text-ink">
            <img src={t.img} alt="" className="h-[52vh] max-h-[460px] w-auto animate-floaty object-contain drop-shadow-2xl" />
            <h2 className="mt-4 text-5xl">{t.hi}</h2>
            <p className="mt-2 max-w-sm text-lg font-semibold text-ink/75">{t.sub}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {t.chips.map((c) => <span key={c} className="rounded-full border-2 border-ink bg-paper px-4 py-1.5 text-sm font-bold shadow-pop">{c}</span>)}
            </div>
          </motion.div>
        </AnimatePresence>
      </aside>
    </main>
  );
}

function Field({ label, value, onChange, type = "text", icon }: { label: string; value: string; onChange: (v: string) => void; type?: string; icon: string }) {
  const [focus, setFocus] = useState(false);
  const up = focus || value.length > 0;
  return (
    <motion.label initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
      className={`relative flex items-center gap-3 rounded-2xl border-2 bg-paper px-4 pt-3.5 pb-0.5 backdrop-blur transition-all ${focus ? "border-forest shadow-soft" : "border-ink/15"}`}>
      <motion.span animate={{ scale: focus ? 1.25 : 1, rotate: focus ? -10 : 0 }} className="text-xl">{icon}</motion.span>
      <span className={`pointer-events-none absolute right-14 transition-all ${up ? "top-1.5 text-xs text-forest" : "top-1/2 -translate-y-1/2 text-ink/50"}`}>{label}</span>
      <input type={type} value={value} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-lg text-ink outline-none" dir={type === "email" || type === "password" ? "ltr" : "rtl"} />
    </motion.label>
  );
}
