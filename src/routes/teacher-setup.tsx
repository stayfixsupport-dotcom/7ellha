import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import { Confetti, ProgressBar } from "@/components/brand";
import { FancyButton } from "@/components/ui/fancy-button";
import { Pager } from "@/components/Swiper";
import { sfx } from "@/lib/fx";
import { flushStore, setState, useStore } from "@/lib/store";
import { LEVELS, SUBJECTS } from "@/lib/data";
import { profileImageData } from "@/lib/image";

export const Route = createFileRoute("/teacher-setup")({
  head: () => ({
    meta: [
      { title: "إعداد ملف الأستاذ — حلّها" },
      { name: "description", content: "أكمل ملفك كأستاذ: الصورة، الاسم، المستويات والمواد." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "إعداد ملف الأستاذ — حلّها" },
      { property: "og:description", content: "خطوات قليلة لتجهيز ملفك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Setup,
});

const STEPS = ["الصورة", "الاسم", "المستويات", "المواد"];
const STEP_THEMES = ["bg-forest text-cream", "bg-teal text-ink", "bg-ink text-cream", "bg-coral text-cream"];

function Setup() {
  const nav = useNavigate();
  const user = useStore((s) => s.user);
  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState<string | null>(null);
  const [first, setFirst] = useState(user?.name.split(" ")[0] ?? "");
  const [last, setLast] = useState(user?.name.split(" ").slice(1).join(" ") ?? "");
  const [levels, setLevels] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [boom, setBoom] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const pct = Math.round(((photo ? 1 : 0) + (first.trim() ? 0.5 : 0) + (last.trim() ? 0.5 : 0) + (levels.length ? 1 : 0) + (subjects.length ? 1 : 0)) / 4 * 100);
  const canNext = [true, first.trim() && last.trim(), levels.length > 0, subjects.length > 0][step];
  const toggle = (arr: string[], set: (v: string[]) => void, id: string) => { set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]); };
  const next = async () => {
    if (!canNext) { sfx.error(); return; }
    if (step < 3) { sfx.step(step, 4); setStep(step + 1); return; }
    setSaving(true); setSaveError("");
    setState(() => ({ teacher: { photo, first, last, levels, subjects } }));
    try {
      await flushStore();
      setBoom((b) => b + 1); sfx.chord();
      setTimeout(() => nav({ to: "/teacher" }), 1200);
    } catch {
      setSaveError("تعذّر حفظ ملف الأستاذ في السحابة. تحقق من اتصال الإنترنت ثم حاول مجدداً.");
    } finally {
      setSaving(false);
    }
  };
  const onFile = async (f?: File) => {
    if (!f) return;
    try { setPhoto(await profileImageData(f)); sfx.success(); }
    catch (error) { sfx.error(); window.alert(error instanceof Error ? error.message : "تعذّر تحميل الصورة"); }
  };
  const avail = SUBJECTS.filter((s) => s.levels.some((l) => levels.includes(l)));

  return (
    <main className={`relative h-[100svh] w-full max-w-[100vw] overflow-hidden [overflow:clip] transition-colors duration-700 ${STEP_THEMES[step] ?? STEP_THEMES[0]}`} onKeyDown={(e) => e.key === "Enter" && next()}>
      <Confetti fire={boom} />
      <header className="relative z-20 mx-auto max-w-3xl px-5 pt-5">
        <div className="flex items-center justify-between text-sm font-bold">
          <span>إكمال الملف</span>
          <motion.span key={pct} initial={{ scale: 1.5, color: "var(--lime)" }} animate={{ scale: 1 }} className="font-display text-3xl">{pct}%</motion.span>
        </div>
        <ProgressBar value={pct} className="mt-2" />
        <div className="mt-3 grid grid-cols-4 gap-1 text-[11px] sm:text-xs">
          {STEPS.map((s, i) => (
            <button key={s} onClick={() => i <= step && setStep(i)} className={`flex min-w-0 items-center justify-center gap-1 ${i <= step ? "text-current" : "opacity-40"}`}>
              <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${i < step ? "bg-lime text-ink" : "border border-current"}`}>{i < step ? "✓" : i + 1}</span>{s}
            </button>
          ))}
        </div>
      </header>

      <div className="absolute inset-x-0 top-32 bottom-28">
        <Pager index={step} onIndex={(i) => (i < step || canNext) && setStep(i)} count={4}>
          <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center overflow-y-auto px-5 py-4 text-center">
            {step === 0 && (
              <>
                <h1 className="text-4xl sm:text-6xl">صورتك الشخصية</h1>
                <p className="mt-2 opacity-70">ليتعرف عليك تلاميذك (اختياري)</p>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} onClick={() => fileRef.current?.click()}
                  className="relative mt-8 grid h-48 w-48 place-items-center overflow-hidden rounded-full border-4 border-dashed border-lime bg-paper/10">
                  {photo ? <img src={photo} alt="الصورة" className="h-full w-full object-cover" /> : <span className="text-6xl">📸</span>}
                  <span className="absolute bottom-3 rounded-full bg-lime px-3 py-1 text-xs font-bold text-ink">{photo ? "تغيير" : "رفع صورة"}</span>
                </motion.button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
              </>
            )}
            {step === 1 && (
              <>
                <h1 className="text-4xl sm:text-6xl">ما اسمك أستاذ؟</h1>
                <div className="mt-8 grid w-full max-w-lg gap-4 sm:grid-cols-2">
                  {[["الاسم", first, setFirst], ["اللقب", last, setLast]].map(([l, v, s]) => (
                    <input key={l as string} aria-label={l as string} placeholder={l as string} value={v as string} onChange={(e) => (s as (x: string) => void)(e.target.value)}
                      className="w-full min-w-0 rounded-2xl border-2 border-ink/20 bg-paper/80 px-5 py-4 text-center text-2xl font-bold text-ink outline-none placeholder:text-ink/50 focus:border-forest" />
                  ))}
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <h1 className="text-4xl sm:text-6xl">ما المستويات التي تدرّسها؟</h1>
                <div className="mt-8 grid w-full max-w-xl grid-cols-2 gap-3">
                  {LEVELS.map((l) => {
                    const on = levels.includes(l.id);
                    return (
                      <motion.button key={l.id} whileTap={{ scale: 0.94 }} onClick={() => toggle(levels, setLevels, l.id)}
                        className={`relative rounded-3xl border-4 p-4 text-right transition-colors sm:p-5 ${on ? "border-ink bg-lime text-ink shadow-pop" : "border-cream/20 bg-paper/5"}`}>
                        <div className="font-display text-3xl sm:text-4xl">{l.short}</div>
                        <div className="text-sm font-semibold opacity-80">{l.name}</div>
                        <AnimatePresence>{on && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute top-3 left-3 grid h-7 w-7 place-items-center rounded-full bg-ink text-cream">✓</motion.span>}</AnimatePresence>
                      </motion.button>
                    );
                  })}
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <h1 className="text-4xl sm:text-6xl">وما موادّك؟</h1>
                <p className="mt-2 opacity-70">حسب المستويات التي اخترتها</p>
                <div className="mt-6 flex max-h-full max-w-2xl flex-wrap overflow-y-auto pb-2 justify-center gap-2.5">
                  {avail.map((s, k) => {
                    const on = subjects.includes(s.id);
                    return (
                      <motion.button key={s.id} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: k * 0.04, type: "spring" }} whileTap={{ scale: 0.9 }}
                        onClick={() => toggle(subjects, setSubjects, s.id)}
                        className={`flex items-center gap-2 rounded-full border-2 px-4 py-2.5 font-bold transition-all ${on ? "border-ink bg-sun text-ink shadow-pop" : "border-cream/25 bg-paper/5"}`}>
                        <span className="text-lg">{s.icon}</span>{s.name}
                      </motion.button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </Pager>
      </div>

      {saveError && <p role="alert" className="absolute inset-x-5 bottom-24 z-20 mx-auto max-w-3xl rounded-xl bg-coral px-4 py-2 text-center font-bold text-paper">{saveError}</p>}
      <footer className="absolute inset-x-0 bottom-0 z-20 mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 pb-8">
        <FancyButton data-sfx="back" variant={step === 1 ? "outline" : "ghost"} onClick={() => step > 0 && setStep(step - 1)} disabled={step === 0}>→ رجوع</FancyButton>
        <FancyButton data-sfx="none" variant={step === 1 || step === 3 ? "sun" : "lime"} onClick={() => void next()} disabled={!canNext || saving} className="min-w-40">{saving ? "جارٍ الحفظ…" : step === 3 ? "إنهاء 🎉" : step === 0 && !photo ? "تخطي ←" : "التالي ←"}</FancyButton>
      </footer>
    </main>
  );
}
