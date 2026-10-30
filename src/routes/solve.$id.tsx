import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Confetti, ProgressBar } from "@/components/brand";
import { FancyButton } from "@/components/ui/fancy-button";
import { CalculatorModal } from "@/components/CalculatorModal";
import { sfx } from "@/lib/fx";
import { flushStore, getState, recordStudyActivity, setState, useStore } from "@/lib/store";
import { levelOf, subjectOf, TIPS, type Sujet } from "@/lib/data";
import { MathText } from "@/components/MathText";
import trophyImg from "@/assets/trophy.webp";
import { SujetPreview } from "@/components/SujetPreview";
import { TeacherPicker } from "@/components/TeacherPicker";
import { OriginalSujetPages } from "@/components/OriginalSujetPages";

export const Route = createFileRoute("/solve/$id")({
  head: () => ({
    meta: [
      { title: "حلّ الموضوع — حلّها" },
      { name: "description", content: "أجب عن أسئلة الموضوع تمريناً بتمرين مع تتبع تقدمك." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "حلّ الموضوع — حلّها" },
      { property: "og:description", content: "حل تفاعلي للمواضيع." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Solve,
});

function Solve() {
  const { id } = Route.useParams();
  const sujet = useStore((s) => s.sujets.find((x) => x.id === id));
  const role = useStore((s) => s.role);
  if (!sujet) return <div className="grid min-h-screen place-items-center text-2xl">الموضوع غير موجود</div>;
  if (role === "teacher") return <SujetPreview sujet={sujet} />;
  return <Solver s={sujet} />;
}

function Solver({ s }: { s: Sujet }) {
  const nav = useNavigate();
  const saved = useStore((st) => st.drafts[s.id]);
  const user = useStore((st) => st.user);
  const uid = useStore((st) => st.uid);
  const teachers = useStore((st) => st.teachers ?? []);
  const answers = saved ?? {};
  const [ex, setEx] = useState(0);
  const [preview, setPreview] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [boom, setBoom] = useState(0);
  const [finish, setFinish] = useState(false);
  const [chooseTeacher, setChooseTeacher] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [sendError, setSendError] = useState("");
  const [showSubjectTip, setShowSubjectTip] = useState(false);
  const credited = useRef(new Set(Object.keys(answers).filter((k) => answers[k]?.trim())));
  const initialAnswers = useRef(saved ?? {});
  const editedAnswers = useRef(new Set<string>());
  const toastT = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!uid) return;
    setShowSubjectTip(localStorage.getItem(`7ellha-subject-tip:${uid}`) !== "dismissed");
  }, [uid]);

  const dismissSubjectTip = () => {
    if (uid) localStorage.setItem(`7ellha-subject-tip:${uid}`, "dismissed");
    setShowSubjectTip(false);
  };

  useEffect(() => {
    if (!preview) return;
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, [preview]);

  const all = s.exercises.flatMap((e) => e.questions);
  const done = all.filter((q) => answers[q.id]?.trim()).length;
  const pct = Math.round((done / all.length) * 100);
  const e = s.exercises[ex];
  if (!e) return <main className="p-6">لا توجد تمارين في الموضوع</main>;
  const exDone = e.questions.filter((q) => answers[q.id]?.trim()).length;

  const write = (qid: string, v: string) => {
    if (v === (initialAnswers.current[qid] ?? "")) editedAnswers.current.delete(qid);
    else editedAnswers.current.add(qid);
    setState((st) => ({ drafts: { ...st.drafts, [s.id]: { ...(st.drafts[s.id] ?? {}), [qid]: v } } }));
  };
  const commit = (qid: string) => {
    const v = getState().drafts[s.id]?.[qid] ?? "";
    if (!v.trim()) { editedAnswers.current.delete(qid); return; }
    if (!editedAnswers.current.delete(qid)) return;
    void recordStudyActivity(s.id, qid).catch((error) => console.error("Study activity sync failed", error));
    if (credited.current.has(qid)) return;
    credited.current.add(qid);
    const n = credited.current.size, p = Math.round((n / all.length) * 100);
    sfx.success();
    const msg = p === 100 ? "🏆 أكملت كل الأسئلة! أنت بطل" : p >= 50 && Math.round(((n - 1) / all.length) * 100) < 50 ? "🎉 نصف الطريق! استمر" : (TIPS[n % TIPS.length] ?? "");
    if (p === 100 || msg.startsWith("🎉")) setBoom((b) => b + 1);
    setToast(msg);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), 2600);
  };
  const go = (n: number) => { sfx.step(Math.max(0, n - 1), 99); setEx(n); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const send = async (teacherUid: string) => {
    const sub = { id: crypto.randomUUID(), sujetId: s.id, studentUid: getState().uid ?? "", teacherUid, studentName: user?.name ?? "تلميذ", ...(user?.email ? { studentEmail: user.email } : {}), answers, sentAt: new Date().toISOString().slice(0, 10) };
    const savedDraft = getState().drafts[s.id] ?? answers;
    setState((st) => {
      const drafts = { ...st.drafts };
      delete drafts[s.id];
      return { submissions: [...st.submissions, sub], drafts };
    });
    setSendBusy(true); setSendError("");
    try {
      await flushStore();
      setChooseTeacher(false);
      sfx.chord(); setBoom((b) => b + 1);
      nav({ to: "/print/$id", params: { id: sub.id } });
    } catch {
      setState((st) => ({ submissions: st.submissions.filter((item) => item.id !== sub.id), drafts: { ...st.drafts, [s.id]: savedDraft } }));
      setSendError("تعذّر إرسال الحل. تحقق من الاتصال ثم حاول مجدداً.");
      setSendBusy(false);
    }
  };

  return (
    <main className="min-h-[100svh] bg-cream pb-32">
      <Confetti fire={boom} />
      <header className="sticky top-0 z-30 border-b-2 border-ink bg-forest text-cream">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Link to="/student" data-sfx="back" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper/10 text-xl">→</Link>
          <div className="min-w-0 flex-1">
            <div className="truncate font-bold">{s.title}</div>
            <div className="text-xs text-cream/70">{subjectOf(s.subject).name} · {levelOf(s.level).short} · ⏱ {s.duration}</div>
          </div>
          <div className="relative shrink-0">
            <button
              type="button"
              aria-describedby={showSubjectTip ? "original-sujet-tip" : undefined}
              onClick={() => { dismissSubjectTip(); setPreview(true); }}
              className={`rounded-xl border-2 px-3 py-1.5 text-sm font-bold transition-colors ${showSubjectTip ? "border-lime bg-lime text-ink" : "border-cream/30"}`}
            >
              👁 الموضوع
            </button>
            <AnimatePresence>
              {showSubjectTip && (
                <motion.aside
                  id="original-sujet-tip"
                  role="note"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute left-0 top-[calc(100%+0.75rem)] z-50 w-[min(18rem,80vw)] rounded-2xl border-2 border-ink bg-paper p-4 text-right text-ink shadow-pop"
                >
                  <span
                    aria-hidden
                    className="absolute -top-2 left-6 h-3 w-3 rotate-45 border-l-2 border-t-2 border-ink bg-paper"
                  />
                  <div className="flex items-start gap-3">
                    <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lime text-lg">👁</span>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-bold">الرجوع إلى الموضوع الأصلي</h2>
                      <p className="mt-1 text-sm leading-relaxed text-ink/70">اضغط «الموضوع» لمعاينة الورقة الأصلية وقت الحل.</p>
                    </div>
                    <button
                      type="button"
                      aria-label="إخفاء التلميح"
                      onClick={dismissSubjectTip}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-lg text-ink/60 transition-colors hover:bg-ink/10 hover:text-ink"
                    >
                      ×
                    </button>
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>
          </div>
          {(s.subject === "math" || s.subject === "physics") && (
            <button
              type="button"
              data-sfx="none"
              onClick={() => setCalcOpen(true)}
              className="shrink-0 rounded-xl border-2 border-ink bg-sun px-3 py-1.5 text-sm font-bold text-ink shadow-sm transition-transform active:scale-95"
            >
              🧮 الحاسبة العلمية
            </button>
          )}
        </div>
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 pb-3">
          <ProgressBar value={pct} className="bg-paper/15" />
          <motion.span key={pct} initial={{ scale: 1.6 }} animate={{ scale: 1 }} className="w-14 shrink-0 text-left font-display text-2xl text-lime">{pct}%</motion.span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4">
        {/* Exercise stepper */}
        <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
          {s.exercises.map((x, i) => {
            const d = x.questions.filter((q) => answers[q.id]?.trim()).length;
            const full = d === x.questions.length;
            return (
              <button key={x.id} onClick={() => go(i)} className={`relative shrink-0 rounded-2xl border-2 border-ink px-4 py-2 text-sm font-bold transition-all ${i === ex ? "bg-ink text-cream shadow-pop" : full ? "bg-lime" : "bg-paper"}`}>
                {full ? "✓ " : ""}تمرين {i + 1} <span className="opacity-60">{d}/{x.questions.length}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.section key={ex} initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ type: "spring", damping: 24 }}
            drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.1}
            onDragEnd={(_, info) => { if (info.offset.x > 90 && ex < s.exercises.length - 1) go(ex + 1); if (info.offset.x < -90 && ex > 0) go(ex - 1); }}>
            <div className="mt-4 rounded-[2rem] border-2 border-ink bg-teal p-5 shadow-pop sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-3xl text-ink sm:text-4xl"><MathText text={e.title} /></h1>
                <span className="shrink-0 rounded-full bg-ink px-3 py-1 text-sm font-bold text-cream">{exDone}/{e.questions.length}</span>
              </div>
              <p className="mt-3 rounded-2xl bg-paper/80 p-4 text-lg font-medium leading-relaxed text-ink"><MathText text={e.context} /></p>
            </div>

            <div className="mt-5 space-y-4">
              {e.questions.map((q, i) => {
                const v = answers[q.id] ?? "";
                const ok = v.trim().length > 0;
                return (
                  <motion.div key={q.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    className={`relative rounded-[1.75rem] border-2 border-ink bg-paper p-5 shadow-pop transition-colors ${ok ? "ring-4 ring-lime/60" : ""}`}>
                    <div className="flex items-start gap-3">
                      <motion.span animate={ok ? { rotate: [0, -15, 15, 0], scale: [1, 1.2, 1] } : {}} className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border-2 border-ink font-display text-xl ${ok ? "bg-lime" : "bg-sun"}`}>{ok ? "✓" : i + 1}</motion.span>
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-bold leading-relaxed"><MathText text={q.text} /></p>
                        <span className="text-xs font-bold text-muted-foreground">{q.points} ن</span>
                      </div>
                    </div>
                    <textarea value={v} onChange={(ev) => write(q.id, ev.target.value)} onBlur={() => commit(q.id)} rows={4} placeholder="اكتب إجابتك هنا…"
                      className="mt-4 w-full resize-y rounded-2xl border-2 border-border bg-cream p-4 text-lg leading-relaxed outline-none transition-all focus:border-teal focus:bg-paper focus:shadow-soft" />
                    <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                      <span>{v.length} حرف</span>
                      {ok && <button onClick={() => commit(q.id)} className="font-bold text-forest">حفظ ✓</button>}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        </AnimatePresence>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <FancyButton data-sfx="none" variant="outline" disabled={ex === 0} onClick={() => go(ex - 1)}>→ السابق</FancyButton>
          {ex < s.exercises.length - 1
            ? <FancyButton data-sfx="none" onClick={() => go(ex + 1)}>التمرين التالي ←</FancyButton>
            : <FancyButton variant="sun" onClick={() => { setFinish(true); }}>إنهاء وإرسال 🏁</FancyButton>}
        </div>
      </footer>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: 80, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 80, opacity: 0 }}
            className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-sm rounded-2xl border-2 border-ink bg-ink px-5 py-4 text-center text-lg font-bold text-lime shadow-soft">{toast}</motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {preview && (
          <motion.div className="fixed inset-0 z-50 overflow-hidden overscroll-contain bg-ink/70 backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPreview(false)}>
            <motion.div onClick={(ev) => ev.stopPropagation()} initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 26 }}
              className="absolute inset-x-0 bottom-0 mx-auto max-h-[88svh] max-w-3xl touch-pan-y overscroll-contain overflow-y-auto rounded-t-[2rem] border-4 border-b-0 border-ink bg-paper p-6">
              <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-ink/20" />
              <div className="text-center"><div className="text-sm font-bold text-muted-foreground">{levelOf(s.level).name} · {subjectOf(s.subject).name}</div><h2 className="mt-1 text-3xl">{s.title}</h2></div>
              {!!s.sourcePageCount && (
                <div className="mt-6 border-b-2 border-border pb-6">
                  <OriginalSujetPages
                    sujetId={s.id}
                    pageCount={s.sourcePageCount}
                    title="النسخة الأصلية"
                  />
                </div>
              )}
              {s.exercises.map((x) => (
                <div key={x.id} className="mt-6"><h3 className="text-2xl text-forest"><MathText text={x.title} /></h3><p className="mt-2 leading-relaxed"><MathText text={x.context} /></p>
                  <ol className="mt-2 list-decimal space-y-1 pr-6">{x.questions.map((q) => <li key={q.id}><MathText text={q.text} /> <span className="text-xs text-muted-foreground">({q.points} ن)</span></li>)}</ol></div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {finish && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4 backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setFinish(false)}>
            <motion.div onClick={(ev) => ev.stopPropagation()} initial={{ scale: 0.6, rotate: -6 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0.6 }} transition={{ type: "spring", damping: 14 }}
              className="w-full max-w-md rounded-[2rem] border-4 border-ink bg-sun p-6 text-center shadow-pop">
              <img src={trophyImg} alt="" width={720} height={720} className="mx-auto h-40 w-auto animate-floaty" />
              <h2 className="text-4xl">{pct === 100 ? "عمل رائع!" : "متأكد؟"}</h2>
              <p className="mt-2 font-semibold">أجبت عن {done} من {all.length} سؤال ({pct}%)</p>
              <div className="mt-5 grid gap-3">
                {sendError && <p role="alert" className="rounded-xl bg-coral/15 px-3 py-2 text-sm font-bold text-coral">{sendError}</p>}
                <FancyButton data-sfx="none" variant="ink" disabled={sendBusy} onClick={() => setChooseTeacher(true)}>📨 اختيار أستاذ وإرسال</FancyButton>
                <FancyButton variant="outline" onClick={() => setFinish(false)}>مواصلة الحل</FancyButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {chooseTeacher && <TeacherPicker teachers={teachers} level={s.level} subject={s.subject} busy={sendBusy} onClose={() => setChooseTeacher(false)} onSelect={(teacherUid) => void send(teacherUid)} />}
      {(s.subject === "math" || s.subject === "physics") && (
        <CalculatorModal open={calcOpen} onOpenChange={setCalcOpen} />
      )}
    </main>
  );
}
