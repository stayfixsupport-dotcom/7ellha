import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import { X } from "lucide-react";
import { AppShell, Avatar, Stat } from "@/components/AppShell";
import { SujetCard, SujetCardSkeleton, SujetSyncNotice } from "@/components/SujetCard";
import { studentSujets } from "@/lib/grading";
import { useStore } from "@/lib/store";
import { levelOf, SUBJECTS, type Sujet } from "@/lib/data";
import { ProfilePanel } from "@/components/ProfilePanel";
import { FancyButton } from '@/components/ui/fancy-button';
import { summarizeStudyDays } from "@/lib/streak";
import { getStudentPointLedger } from "@/lib/points";
import { UploadModal } from "@/routes/teacher";

export const Route = createFileRoute("/student")({
  head: () => ({
    meta: [
      { title: "لوحة التلميذ — حلّها" },
      { name: "description", content: "تصفح مواضيع مستواك وحلّها تفاعلياً مع تتبع تقدمك." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "لوحة التلميذ — حلّها" },
      { property: "og:description", content: "مواضيع BEM و BAC وغيرها بانتظارك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Student,
});

const NAV = [
  { id: "home", label: "الرئيسية", icon: "🏠" },
  { id: "explore", label: "استكشف", icon: "🔎" },
  { id: "scan", label: "ماسح", icon: "📷" },
  { id: "mine", label: "حلولي", icon: "🏆" },
  { id: "profile", label: "حسابي", icon: "👤" },
];

function Student() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("home");
  const user = useStore((s) => s.user);
  const level = useStore((s) => s.studentLevel);
  const sujets = useStore((s) => s.sujets);
  const sujetsLoading = useStore((s) => s.sujetsLoading);
  const sujetsSyncError = useStore((s) => s.sujetsSyncError);
  const drafts = useStore((s) => s.drafts);
  const subs = useStore((s) => s.submissions);
  const studyDays = useStore((s) => s.studyDays) ?? [];
  const streak = summarizeStudyDays(studyDays);
  const [subject, setSubject] = useState<string | null>(null);
  const [pickerSujet, setPickerSujet] = useState<Sujet | null>(null);
  const [upload, setUpload] = useState(false);
  const [source, setSource] = useState<"all" | "student" | "teacher">("all");
  const [q, setQ] = useState("");
  const categoryDrag = useRef<{ pointer: number; startX: number; scroll: number; moved: boolean } | null>(null);
  const [draggingCategories, setDraggingCategories] = useState(false);
  const name = user?.name ?? "تلميذ";
  const lv = levelOf(level);
  const levelSujets = studentSujets(sujets, level);
  const list = levelSujets.filter((s) => !subject || s.subject === subject);
  const prog = (id: string) => {
    const s = sujets.find((x) => x.id === id);
    if (!s) return 0;
    const total = s.exercises.reduce((a, e) => a + e.questions.length, 0);
    return total ? Math.round((Object.values(drafts[id] ?? {}).filter((v) => v.trim()).length / total) * 100) : 0;
  };
  const mySubs = subs.filter((x) => x.studentEmail ? x.studentEmail === user?.email : x.studentName === name);
  const points = getStudentPointLedger(studyDays, mySubs, sujets).total;

  const solveBtn = (sujet: Sujet) => (
    <button type="button" onClick={() => setPickerSujet(sujet)}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-lime py-3 font-bold text-ink shadow-pop transition-transform active:translate-y-1 active:shadow-none">
      ✍️ {prog(sujet.id) > 0 ? `أكمل الحل (${prog(sujet.id)}%)` : "حلّ الموضوع"}
    </button>
  );

  return (
    <AppShell items={NAV} active={upload ? "scan" : tab} onNav={(id) => { if (id === "scan") setUpload(true); else setTab(id); }} name={name} sub={lv.name} avatar={<Avatar src={user?.photo} name={name} />}>
      <div className="mx-auto max-w-6xl px-5 py-6 lg:px-10 lg:py-10">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            {tab === "home" && (
              <>
                <section className="relative overflow-hidden rounded-[2rem] border-2 border-ink bg-sun p-6 shadow-pop sm:p-10">
                  <div className="absolute -top-16 -left-16 h-64 w-64 animate-blob bg-coral/30" />
                  <div className="relative max-w-2xl text-ink">
                    <p className="text-lg font-bold">أهلاً {name.split(" ")[0]} 🔥</p>
                    <h1 className="mt-1 text-4xl leading-tight sm:text-6xl">جاهز لتحدّي اليوم؟</h1>
                    <p className="mt-3 text-lg font-semibold opacity-80">{sujetsLoading && !sujets.length ? "جارٍ تحميل المواضيع…" : `${list.length} مواضيع في ${lv.name}`}</p>

                  </div>
                </section>
                <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
                  <Link to="/student-streak" className="rounded-3xl focus-visible:outline-2 focus-visible:outline-forest"><Stat label="سلسلة أيام" value={streak.currentStreak} icon="📅" bg="bg-coral" /></Link>
                  <Link to="/student-solutions" className="rounded-3xl focus-visible:outline-2 focus-visible:outline-forest"><Stat label="حلول مرسلة" value={mySubs.length} icon="📨" bg="bg-lime" /></Link>
                  <Link to="/student-points" className="rounded-3xl focus-visible:outline-2 focus-visible:outline-forest"><Stat label="نقاط" value={points} icon="⭐" bg="bg-teal" /></Link>
                </div>
                <h2 className="mt-10 text-3xl">المواد</h2>
                <div aria-label="المواد" className={`mt-4 flex select-none gap-2 overflow-x-auto pb-3 sm:gap-3 ${draggingCategories ? 'cursor-grabbing' : 'cursor-grab'}`}
                  onPointerDown={(event) => {
                    if (event.pointerType !== 'mouse' || event.button !== 0) return;
                    categoryDrag.current = { pointer: event.pointerId, startX: event.clientX, scroll: event.currentTarget.scrollLeft, moved: false };
                  }}
                  onPointerMove={(event) => {
                    const drag = categoryDrag.current;
                    if (!drag || drag.pointer !== event.pointerId || event.buttons !== 1) return;
                    const distance = event.clientX - drag.startX;
                    if (!drag.moved && Math.abs(distance) <= 6) return;
                    if (!drag.moved) {
                      drag.moved = true;
                      event.currentTarget.setPointerCapture(event.pointerId);
                      setDraggingCategories(true);
                    }
                    event.currentTarget.scrollLeft = drag.scroll - distance;
                  }}
                  onPointerUp={() => setDraggingCategories(false)}
                  onPointerCancel={() => { categoryDrag.current = null; setDraggingCategories(false); }}
                  onClickCapture={(event) => {
                    if (categoryDrag.current?.moved) { event.preventDefault(); event.stopPropagation(); }
                    categoryDrag.current = null;
                  }}>
                  <Chip on={!subject} onClick={() => setSubject(null)}>✨ الكل</Chip>
                  {SUBJECTS.filter((s) => (s.levels as readonly string[]).includes(level)).map((s) => (
                    <Chip key={s.id} on={subject === s.id} onClick={() => setSubject(s.id)}>{s.icon} {s.name}</Chip>
                  ))}
                </div>
                <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {sujetsLoading && !sujets.length
                    ? <div role="status" aria-label="جارٍ تحميل المواضيع" aria-busy="true" className="col-span-full grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <SujetCardSkeleton key={i} actionCount={1} progress />)}</div>
                    : list.map((s, i) => <SujetCard key={s.id} s={s} i={i} progress={prog(s.id)} action={solveBtn(s)} />)}
                  <SujetSyncNotice error={sujetsSyncError} />
                  {!sujetsLoading && !sujetsSyncError && !list.length && <Empty />}
                </div>
              </>
            )}
            {tab === "explore" && (
              <>
                <h1 className="text-4xl">استكشف مواضيعك</h1>
                <div role="tablist" aria-label="مصدر المواضيع" className="mt-5 flex gap-2 overflow-x-auto pb-1">
                  {([ ["all", "الكل"], ["student", "من التلاميذ"], ["teacher", "من الأساتذة"] ] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={source === id} onClick={() => setSource(id)} className={`min-h-11 shrink-0 rounded-xl border-2 border-ink px-4 py-2 font-bold ${source === id ? "bg-forest text-cream shadow-pop" : "bg-paper"}`}>{label}</button>)}
                </div>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔎 ابحث عن موضوع، مادة أو أستاذ..."
                  className="mt-5 w-full rounded-2xl border-2 border-ink bg-paper px-5 py-4 text-lg font-semibold shadow-pop outline-none focus:bg-lime/10" />
                <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {sujetsLoading && !sujets.length
                    ? <div role="status" aria-label="جارٍ تحميل المواضيع" aria-busy="true" className="col-span-full grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <SujetCardSkeleton key={i} actionCount={1} />)}</div>
                    : levelSujets.filter((s) => (source === "all" || (source === "student" ? s.creatorType === "student" : s.creatorType !== "student")) && (!q || `${s.title} ${s.teacher} ${s.subject}`.includes(q))).map((s, i) => <SujetCard key={s.id} s={s} i={i} action={solveBtn(s)} />)}
                  <SujetSyncNotice error={sujetsSyncError} />
                  {!sujetsLoading && !sujetsSyncError && !levelSujets.some((s) => (source === "all" || (source === "student" ? s.creatorType === "student" : s.creatorType !== "student")) && (!q || `${s.title} ${s.teacher} ${s.subject}`.includes(q))) && <Empty text="لا توجد مواضيع في هذا التصنيف لمستواك بعد" />}
                </div>
              </>
            )}
            {tab === "mine" && (
              <>
                <h1 className="text-4xl">حلولي المرسلة</h1>
                <div className="mt-6 space-y-3">
                  {mySubs.length ? mySubs.map((x) => {
                    const s = sujets.find((y) => y.id === x.sujetId);
                    return s && (
                      <div key={x.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-3xl border-2 border-ink bg-paper p-4 shadow-pop">
                        <div className="min-w-0"><div className="truncate font-bold">{s.title}</div><div className="text-sm text-muted-foreground">أُرسل في {x.sentAt}</div>{x.correction?.publishedAt ? <><div className="mt-2 font-display text-2xl text-forest">🏅 <span dir="ltr">{x.correction.mark}/20</span></div>{x.correction.note && <p className="mt-1 whitespace-pre-wrap text-base">{x.correction.note}</p>}</> : <p className="mt-2 text-sm text-muted-foreground">بانتظار التصحيح</p>}</div>
                        <Link to="/print/$id" params={{ id: x.id }} className="rounded-2xl border-2 border-ink bg-sun px-4 py-2 font-bold">🖨 طباعة</Link>
                      </div>
                    );
                  }) : <Empty text="لم ترسل أي حل بعد — ابدأ الآن!" />}
                </div>
              </>
            )}
            {tab === "profile" && <ProfilePanel role="student" />}
          </motion.div>
        </AnimatePresence>
      </div>
      {pickerSujet && <div className="fixed inset-0 z-50 grid place-items-center bg-ink/15 px-4 py-6 backdrop-blur-md" dir="rtl">
        <section role="dialog" aria-modal="true" aria-label="اختيار طريقة الحل" className="relative w-full max-w-md rounded-3xl border-2 border-ink bg-paper p-5 shadow-pop sm:p-7">
          <button type="button" data-sfx="back" aria-label="إغلاق" onClick={() => setPickerSujet(null)} className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-cream"><X size={19} /></button>
          <div className="grid gap-3 pt-12">
            <button type="button" onClick={() => void navigate({ to: "/solve/$id", params: { id: pickerSujet.id } })} className="flex min-h-16 items-center justify-center gap-3 rounded-2xl border-2 border-ink bg-lime px-4 py-4 text-xl font-bold text-ink shadow-pop transition-transform hover:-translate-y-0.5">
              <span aria-hidden>✍</span>حل عبر الإنترنت
            </button>
            <button type="button" onClick={() => void navigate({ to: "/offline/$id", params: { id: pickerSujet.id } })} className="flex min-h-16 items-center justify-center gap-3 rounded-2xl border-2 border-ink bg-sun px-4 py-4 text-xl font-bold text-ink shadow-pop transition-transform hover:-translate-y-0.5">
              <span aria-hidden>📝</span>حل على الورق
            </button>
          </div>
        </section>
      </div>}
      <AnimatePresence>{upload && <UploadModal creatorRole="student" onClose={() => setUpload(false)} />}</AnimatePresence>
    </AppShell>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <FancyButton variant="outline" onClick={onClick} className={`shrink-0 rounded-2xl px-4 py-2.5 text-base font-bold transition-all ${on ? "bg-forest text-cream shadow-pop" : "bg-paper shadow-none"}`}>{children}</FancyButton>;
}
function Empty({ text = "لا توجد مواضيع لهذه المادة بعد" }: { text?: string }) {
  return <div className="col-span-full rounded-3xl border-2 border-dashed border-border p-10 text-center text-muted-foreground"><div className="text-5xl">🌱</div><p className="mt-2 font-semibold">{text}</p></div>;
}
