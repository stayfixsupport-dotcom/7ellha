import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { ArrowRight, Search, Check, Clock, Star, Flame, Inbox, BookOpen, Users } from "lucide-react";
import { Avatar } from "@/components/AppShell";
import { SujetCard, SujetCardSkeleton, SujetSyncNotice } from "@/components/SujetCard";
import { FancyButton } from "@/components/ui/fancy-button";
import { useStore } from "@/lib/store";
import { levelOf } from "@/lib/data";
import trophy from "@/assets/trophy.webp";
import { summarizeStudyDays } from "@/lib/streak";
import { getStudentPointLedger } from "@/lib/points";

type ActivityKind = "solutions" | "points" | "streak" | "sujets" | "answers" | "students";
const PAGES = {
  solutions: { title: "حلول مرسلة", icon: Inbox, color: "bg-lime" },
  points: { title: "نقاط", icon: Star, color: "bg-teal" },
  streak: { title: "سلسلة أيام", icon: Flame, color: "bg-coral" },
  sujets: { title: "المواضيع", icon: BookOpen, color: "bg-lime" },
  answers: { title: "إجابات مستلمة", icon: Inbox, color: "bg-sun" },
  students: { title: "تلاميذ نشطون", icon: Users, color: "bg-teal" },
};

export function activityHead(title: string, description: string) {
  return { meta: [{ title: `${title} — حلّها` }, { name: "description", content: description }, { name: "robots", content: "noindex, nofollow" }, { property: "og:title", content: `${title} — حلّها` }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] };
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="py-16 text-center"><Inbox className="mx-auto mb-4 h-14 w-14 text-teal" /><p className="text-xl font-semibold text-muted-foreground">{children}</p></div>;
}

export function ActivityPage({ kind }: { kind: ActivityKind }) {
  const reduced = useReducedMotion();
  const user = useStore((s) => s.user);
  const uid = useStore((s) => s.uid);
  const sujets = useStore((s) => s.sujets);
  const sujetsLoading = useStore((s) => s.sujetsLoading);
  const sujetsSyncError = useStore((s) => s.sujetsSyncError);
  const ownSujets = sujets.filter((s) => s.ownerUid === uid && s.creatorType !== "student");
  const submissions = useStore((s) => s.submissions);
  const studyDays = useStore((s) => s.studyDays) ?? [];
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const teacher = kind === "sujets" || kind === "answers" || kind === "students";
  const mine = submissions.filter((s) => s.studentEmail ? s.studentEmail === user?.email : s.studentName === (user?.name ?? "تلميذ"));
  const list = teacher ? submissions : mine;
  const students = Array.from(new Set(submissions.map((s) => s.studentEmail || s.studentName))).map((key) => {
    const answers = submissions.filter((s) => (s.studentEmail || s.studentName) === key);
    const latest = answers.at(-1);
    return { key, name: latest?.studentName ?? "تلميذ", answers, latest };
  });
  const config = PAGES[kind];
  const PageIcon = config.icon;
  const pointLedger = getStudentPointLedger(studyDays, mine, sujets);
  const points = pointLedger.total;
  const nextMilestone = (Math.floor(points / 100) + 1) * 100;
  const milestoneProgress = points % 100;
  const streak = summarizeStudyDays(studyDays);
  const count = kind === "sujets" ? ownSujets.length : kind === "students" ? students.length : kind === "points" ? points : kind === "streak" ? streak.currentStreak : list.length;
  const displayCount = kind === "sujets" && sujetsLoading && !sujets.length ? "…" : count;
  const filtered = [...list].reverse().filter((s) => {
    const sujet = sujets.find((x) => x.id === s.sujetId);
    return sujet && (!query || `${s.studentName} ${sujet.title}`.includes(query)) && (status === "all" || (status === "corrected" ? !!s.correction?.publishedAt : !s.correction?.publishedAt));
  });
  return (
    <main className="min-h-svh bg-cream pb-12">
      <header className={`border-b-2 border-ink ${config.color} text-ink`}>
        <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-10">
          <Link to={teacher ? "/teacher" : "/student"} data-sfx="back" className="inline-flex items-center gap-2 text-lg font-bold"><span className="grid h-11 w-11 place-items-center rounded-full border-2 border-ink bg-paper"><ArrowRight size={22} /></span>الرئيسية</Link>
          <div className="mt-6 flex items-center gap-4"><PageIcon className="h-12 w-12 shrink-0" aria-hidden /><div className="min-w-0"><h1 className="text-4xl leading-tight sm:text-5xl">{config.title}</h1><p className="mt-2 font-display text-3xl sm:text-4xl">{displayCount} <span className="font-sans text-lg font-bold">{kind === "streak" ? "أيام متتالية" : kind === "points" ? "نقطة" : kind === "students" ? "تلميذ" : kind === "sujets" ? "موضوع" : "حل"}</span></p></div></div>
        </div>
      </header>
      <motion.div initial={reduced ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mx-auto max-w-6xl px-5 pt-7 sm:px-8">
        {!["points", "streak"].includes(kind) && <div className="relative mb-6"><Search className="pointer-events-none absolute right-4 top-4 text-muted-foreground" size={22} /><input aria-label="بحث" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={kind === "students" ? "ابحث عن تلميذ…" : "ابحث عن موضوع أو اسم…"} className="w-full rounded-2xl border-2 border-ink bg-paper py-3 pr-12 pl-4 text-lg outline-none focus:border-forest" /></div>}
        {kind === "sujets" && <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {sujetsLoading && !sujets.length
              ? <div role="status" aria-label="جارٍ تحميل المواضيع" aria-busy="true" className="col-span-full grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <SujetCardSkeleton key={i} actionCount={1} />)}</div>
              : ownSujets.filter((s) => !query || `${s.title} ${s.teacher}`.includes(query)).map((s, i) => <SujetCard key={s.id} s={s} i={Math.min(i, 5)} action={<Link to="/preview/$id" params={{ id: s.id }} className="flex items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-teal py-3 text-lg font-bold">👁 معاينة</Link>} />)}
            <SujetSyncNotice error={sujetsSyncError} />
          </div>
          {!sujetsLoading && !sujetsSyncError && !ownSujets.some((s) => !query || `${s.title} ${s.teacher}`.includes(query)) && <Empty>لا توجد مواضيع مطابقة</Empty>}
        </>}
        {(kind === "solutions" || kind === "answers") && <>
          <div className="mb-6 flex flex-wrap gap-2">{[["all", "الكل"], ["pending", "بانتظار التصحيح"], ["corrected", "تم التصحيح"]].map(([value, label]) => <FancyButton key={value} variant="outline" aria-pressed={status === value} onClick={() => setStatus(value ?? "all")} className={`px-4 py-2 shadow-none ${status === value ? "bg-ink text-cream" : "bg-paper"}`}>{label}</FancyButton>)}</div>
          <div className="space-y-4">{filtered.map((s, i) => {
            const sujet = sujets.find((x) => x.id === s.sujetId);
            if (!sujet) return null;
            const published = !!s.correction?.publishedAt;
            return <motion.article key={s.id} initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.05, 0.25) }} className="rounded-3xl border-2 border-ink bg-paper p-5 shadow-pop">
              {teacher && <div className="mb-3 flex items-center gap-3"><Avatar name={s.studentName} /><p className="text-lg font-bold">{s.studentName}</p></div>}
              <h2 className="text-2xl leading-snug">{sujet.title}</h2><p className="mt-2 text-base text-muted-foreground">{levelOf(sujet.level).short} · {s.sentAt}</p>
              <div className="mt-4 flex items-center gap-2 text-lg font-bold text-forest">{published ? <><Check size={20} /><span>تم التصحيح · <bdi>{s.correction?.mark}/20</bdi></span></> : <><Clock size={20} />بانتظار التصحيح</>}</div>
              {!teacher && published && s.correction?.note && <p className="mt-3 whitespace-pre-wrap text-lg leading-relaxed">{s.correction.note}</p>}
              <div className="mt-5 flex flex-wrap gap-3">{teacher && <Link to="/correct/$id" params={{ id: s.id }} className="rounded-2xl border-2 border-ink bg-sun px-5 py-3 text-lg font-bold">✍️ {published ? "تعديل التصحيح" : s.correction ? "أكمل التصحيح" : "تصحيح"}</Link>}<Link to="/print/$id" params={{ id: s.id }} className="rounded-2xl border-2 border-ink bg-lime px-5 py-3 text-lg font-bold">🖨 ورقة الإجابة</Link></div>
            </motion.article>;
          })}</div>
          {!filtered.length && <Empty>{query || status !== "all" ? "لا توجد حلول مطابقة" : teacher ? "لا توجد إجابات مستلمة بعد" : "لم ترسل أي حل بعد"}</Empty>}
        </>}
        {kind === "students" && <div className="space-y-4">{students.filter((s) => !query || s.name.includes(query)).map((s) => <article key={s.key} className="rounded-3xl border-2 border-ink bg-paper p-5 shadow-pop"><div className="flex items-center gap-3"><Avatar name={s.name} className="h-14 w-14" /><div className="min-w-0"><h2 className="break-words text-2xl">{s.name}</h2><p className="mt-1 text-base text-muted-foreground">آخر إرسال · {s.latest?.sentAt}</p></div></div><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-lg font-bold"><span>📨 {s.answers.length} حلول</span><span>✓ {s.answers.filter((a) => a.correction?.publishedAt).length} مصححة</span></div>{s.latest && <Link to="/correct/$id" params={{ id: s.latest.id }} className="mt-4 inline-flex rounded-2xl border-2 border-ink bg-sun px-4 py-2.5 text-lg font-bold">آخر إجابة ←</Link>}</article>)}{!students.some((s) => !query || s.name.includes(query)) && <Empty>لا يوجد تلاميذ مطابقون</Empty>}</div>}
        {kind === "points" && <>
          <section className="overflow-hidden rounded-3xl border-2 border-ink bg-teal p-5 text-ink sm:p-8">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-bold text-ink/70">رصيدك من التقدّم المسجّل</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <bdi className="font-display text-6xl leading-none sm:text-7xl" aria-label={`${points} نقطة`}>{points}</bdi>
                  <span className="text-xl font-bold">نقطة</span>
                </div>
                <p className="mt-4 max-w-xl text-base font-semibold leading-relaxed">
                  {points === 0
                    ? "ابدأ بحل سؤال واحد؛ كل إجابة تحفظها تقرّبك من إنجازك القادم."
                    : points < 100
                      ? "بداية موفقة! واصل حل الأسئلة لتحقق أول 100 نقطة."
                      : "إنجازك يكبر مع كل إجابة تحفظها وكل موضوع ترسله. واصل بهذا الإيقاع!"}
                </p>
              </div>
              <motion.img src={trophy} alt="" aria-hidden className="h-32 w-32 shrink-0 object-contain sm:h-40 sm:w-40" initial={reduced ? false : { scale: 0.85 }} animate={{ scale: 1 }} />
            </div>
            <div className="mt-5 border-t border-ink/15 pt-5">
              <div className="flex items-center justify-between gap-3 text-sm font-bold">
                <span>المحطة القادمة: <bdi>{nextMilestone}</bdi> نقطة</span>
                <span><bdi>{milestoneProgress}</bdi> / 100</span>
              </div>
              <div
                className="mt-2 h-3 overflow-hidden rounded-full border border-ink/20 bg-paper/50"
                role="progressbar"
                aria-label={`التقدم نحو ${nextMilestone} نقطة`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={milestoneProgress}
              >
                <div className="h-full rounded-full bg-lime transition-[width] duration-500" style={{ width: `${milestoneProgress}%` }} />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink/75">
                كل إجابة تحفظها تمنحك 10 نقاط، وأول إرسال لحل كل موضوع يمنحك 25 نقطة إضافية.
              </p>
            </div>
          </section>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-2xl border border-border bg-paper p-4">
              <p className="font-display text-3xl text-forest">{pointLedger.answeredQuestions}</p>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">سؤال عملت عليه</p>
            </div>
            <div className="rounded-2xl border border-border bg-paper p-4">
              <p className="font-display text-3xl text-forest">{pointLedger.submittedSujets}</p>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">موضوع أرسلت حله</p>
            </div>
          </div>

          <section className="mt-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl sm:text-3xl">سجل إنجازاتك</h2>
                <p className="mt-1 text-sm text-muted-foreground">النقاط مبنية على إجاباتك المحفوظة وحلولك المسجّلة.</p>
              </div>
              <Link to="/student-solutions" className="inline-flex items-center rounded-xl border-2 border-ink bg-lime px-4 py-2.5 font-bold">حلولي المرسلة ←</Link>
            </div>
            <div className="mt-4 divide-y divide-border border-y border-border">
              {pointLedger.entries.map((entry) => {
                const date = entry.day ? new Date(`${entry.day}T12:00:00`) : null;
                const dateLabel = date && !Number.isNaN(date.getTime())
                  ? new Intl.DateTimeFormat("ar-DZ", { day: "numeric", month: "long", year: "numeric" }).format(date)
                  : "تاريخ غير متاح";
                return (
                  <article key={entry.id} className="flex items-center gap-3 py-4 sm:gap-4">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${entry.kind === "answers" ? "bg-lime" : "bg-sun"}`} aria-hidden>
                      {entry.kind === "answers" ? <Check size={21} /> : <Inbox size={21} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-bold">{entry.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{entry.description} · {dateLabel}</p>
                    </div>
                    <bdi className="shrink-0 font-display text-xl font-bold text-forest">+{entry.points}</bdi>
                  </article>
                );
              })}
              {!pointLedger.entries.length && (
                <div className="py-8 text-center">
                  <Star className="mx-auto h-9 w-9 text-teal" aria-hidden />
                  <p className="mt-3 font-bold">أول نقطة تبدأ من أول إجابة تحفظها</p>
                  <p className="mt-1 text-sm text-muted-foreground">حلّ سؤالاً، وستجد إنجازك هنا تلقائياً.</p>
                </div>
              )}
            </div>
          </section>
        </>}
        {kind === "streak" && <>
          <section className="border-b-2 border-border pb-7">
            <div className="flex items-start gap-4">
              <div className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl border-2 border-ink ${streak.activeToday ? "bg-coral" : "bg-paper"}`}><Flame size={34} className={streak.activeToday ? "text-ink" : "text-coral"} /></div>
              <div>
                <h2 className="text-2xl font-bold">{streak.activeToday ? "أحسنت، أنجزت اليوم" : streak.currentStreak ? "حافظ على إيقاعك" : streak.activeDays ? "ابدأ سلسلة جديدة اليوم" : "ابدأ أول يوم لك"}</h2>
                <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
                  {streak.activeToday
                    ? streak.todayQuestions ? `اشتغلت على ${streak.todayQuestions} ${streak.todayQuestions === 1 ? "سؤال" : "أسئلة"} اليوم. كل خطوة تُحسب.` : "سُجّل نشاطك لهذا اليوم. واصل التقدم على مهل."
                    : streak.currentStreak ? `نشاط واحد اليوم يحافظ على سلسلتك الحالية، ${streak.currentStreak} ${streak.currentStreak === 1 ? "يوم" : "أيام"}.` : "حلّ سؤالاً واحداً اليوم ليبدأ تقدمك ويُسجّل يومك."}
                </p>
              </div>
            </div>
          </section>

          <section className="border-b-2 border-border py-7">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div><h2 className="text-2xl">آخر 7 أيام</h2><p className="mt-1 text-sm text-muted-foreground">الأيام التي كتبت فيها إجابة أو أرسلت صفحاتك</p></div>
              <span className="font-bold text-forest">{streak.week.filter((day) => day.active).length} / 7 أيام نشطة</span>
            </div>
            <div className="mt-5 grid grid-cols-7 gap-2" aria-label="نشاط آخر سبعة أيام">
              {streak.week.map((day) => {
                const date = new Date(`${day.day}T12:00:00`);
                const weekday = new Intl.DateTimeFormat("ar-DZ", { weekday: "short" }).format(date);
                const dateLabel = new Intl.DateTimeFormat("ar-DZ", { day: "numeric", month: "short" }).format(date);
                const today = day.day === streak.week.at(-1)?.day;
                return <div key={day.day} aria-label={`${weekday} ${dateLabel}: ${day.active ? `${day.questions} أسئلة` : "لا نشاط"}`} className={`flex min-w-0 flex-col items-center gap-2 border-b-2 py-3 text-center ${day.active ? "border-forest" : "border-border"}`}>
                  <span className="text-xs font-bold text-muted-foreground">{weekday}</span>
                  <span className={`grid h-9 w-9 place-items-center rounded-full font-bold ${day.active ? "bg-lime text-ink" : today ? "border-2 border-coral text-ink" : "bg-muted text-muted-foreground"}`}>{day.active ? <Check size={17} /> : date.getDate()}</span>
                  <span className="min-h-8 text-[11px] leading-tight text-muted-foreground">{day.active ? `${day.questions} ${day.questions === 1 ? "سؤال" : "أسئلة"}` : today ? "اليوم" : ""}</span>
                </div>;
              })}
            </div>
          </section>

          <section className="grid grid-cols-3 divide-x divide-border py-6 text-center" dir="ltr">
            <div dir="rtl"><p className="font-display text-3xl text-forest">{streak.currentStreak}</p><p className="mt-1 text-sm font-semibold text-muted-foreground">السلسلة الحالية</p></div>
            <div dir="rtl"><p className="font-display text-3xl text-forest">{streak.longestStreak}</p><p className="mt-1 text-sm font-semibold text-muted-foreground">أفضل سلسلة</p></div>
            <div dir="rtl"><p className="font-display text-3xl text-forest">{streak.totalQuestions}</p><p className="mt-1 text-sm font-semibold text-muted-foreground">أسئلة عملت عليها</p></div>
          </section>

          <section className="border-t-2 border-border pt-6">
            <h2 className="text-2xl">آخر نشاط</h2>
            {studyDays.length ? [...studyDays].sort((a, b) => b.day.localeCompare(a.day)).slice(0, 7).map((day) => {
              const date = new Date(`${day.day}T12:00:00`);
              const dateLabel = new Intl.DateTimeFormat("ar-DZ", { weekday: "long", day: "numeric", month: "long" }).format(date);
              const titles = day.sujetIds.map((id) => sujets.find((sujet) => sujet.id === id)?.title).filter((title): title is string => !!title);
              return <div key={day.day} className="flex items-start justify-between gap-4 border-b border-border py-4">
                <div className="min-w-0"><p className="font-bold">{dateLabel}</p><p className="mt-1 break-words text-sm text-muted-foreground">{titles.length ? titles.join("، ") : "نشاط تعلم"}</p></div>
                <span className="shrink-0 text-sm font-bold text-forest">{day.questionIds.length ? `${day.questionIds.length} أسئلة` : "نشاط مسجل"}</span>
              </div>;
            }) : <div className="py-6"><p className="font-semibold">لم يُسجّل نشاط بعد.</p><p className="mt-1 text-sm text-muted-foreground">أول إجابة تكتبها ستظهر هنا وتبدأ سلسلة أيامك.</p><Link to="/student" className="mt-4 inline-flex rounded-xl border-2 border-ink bg-sun px-4 py-2 font-bold">ابدأ الحل</Link></div>}
          </section>
        </>}
      </motion.div>
    </main>
  );
}