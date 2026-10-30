import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Avatar } from "@/components/AppShell";
import { levelOf, subjectOf, type Sujet } from "@/lib/data";
import { refreshSujets, useStore } from "@/lib/store";
import { Skeleton } from "@/components/ui/skeleton";

const FILE = { pdf: "PDF", image: "صورة", docx: "Word" };

export function SujetCard({ s, i = 0, action, progress }: { s: Sujet; i?: number; action?: ReactNode; progress?: number }) {
  const lv = levelOf(s.level), sb = subjectOf(s.subject);
  const directoryTeacher = useStore((state) => state.teachers?.find((teacher) => teacher.uid === s.ownerUid));
  const studentCreated = s.creatorType === "student";
  const authorName = studentCreated ? "من التلاميذ" : directoryTeacher?.name ?? s.teacher;
  const authorPhoto = studentCreated ? null : s.teacherPhoto ?? directoryTeacher?.photo;
  const qn = s.exercises.reduce((a, e) => a + e.questions.length, 0);
  return (
    <motion.article initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileHover={{ y: -5 }}
      className="group relative flex flex-col overflow-hidden rounded-3xl border-2 border-ink bg-paper p-5 shadow-pop">
      <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full opacity-40 transition-transform duration-500 group-hover:scale-150" style={{ background: lv.color }} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border-2 border-ink text-2xl font-bold" style={{ background: lv.color }}>{sb.icon}</div>
        <div className="flex flex-wrap justify-end gap-1.5 text-sm font-bold">
          <span className="rounded-full bg-ink px-2.5 py-1 text-cream">{lv.short}</span>
          <span className="rounded-full border border-ink px-2.5 py-1">{FILE[s.fileType]}</span>
        </div>
      </div>
      <h3 className="relative mt-4 text-2xl leading-snug">{s.title}</h3>
      <div className="relative mt-1 flex min-w-0 items-center gap-2 text-base font-semibold text-muted-foreground">
        <Avatar src={authorPhoto} name={authorName} className="h-8 w-8" />
        <span className="truncate">{sb.name} · {authorName}</span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${studentCreated ? "bg-teal/30 text-ink" : "bg-lime/60 text-ink"}`}>{studentCreated ? "تلميذ" : "أستاذ"}</span>
      </div>
      <div className="relative mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm font-bold text-forest">
        <span>⏱ {s.duration}</span><span>📋 {s.exercises.length} تمارين</span><span>❓ {qn} سؤال</span>
      </div>
      {progress !== undefined && (
        <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-limeglow" style={{ width: `${progress}%` }} /></div>
      )}
      {action && <div className="relative mt-4">{action}</div>}
    </motion.article>
  );
}

export function SujetCardSkeleton({ actionCount = 0, progress = false }: { actionCount?: number; progress?: boolean }) {
  return (
    <article aria-hidden="true" className="relative flex flex-col overflow-hidden rounded-3xl border-2 border-ink bg-paper p-5 shadow-pop">
      <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-ink/5" />
      <div className="relative flex items-start justify-between gap-3">
        <Skeleton className="h-14 w-14 shrink-0 rounded-2xl border-2 border-ink" />
        <div className="flex gap-1.5">
          <Skeleton className="h-8 w-14 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-7 w-11/12 rounded-lg" />
        <Skeleton className="h-7 w-2/3 rounded-lg" />
      </div>
      <div className="mt-2 flex min-w-0 items-center gap-2">
        <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
        <Skeleton className="h-5 min-w-0 flex-1 rounded-lg" />
        <Skeleton className="h-6 w-12 shrink-0 rounded-full" />
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        <Skeleton className="h-5 w-16 rounded-lg" />
        <Skeleton className="h-5 w-20 rounded-lg" />
        <Skeleton className="h-5 w-16 rounded-lg" />
      </div>
      {progress && <Skeleton className="mt-3 h-2 w-full rounded-full" />}
      {actionCount > 0 && (
        <div className={`mt-4 grid gap-2 ${actionCount > 1 ? "grid-cols-[minmax(0,1fr)_auto]" : ""}`}>
          {Array.from({ length: actionCount }, (_, index) => (
            <Skeleton
              key={index}
              className={`rounded-2xl ${actionCount > 1
                ? index > 0 ? "h-10 w-12" : "h-11 w-full"
                : "h-12 w-full"}`}
            />
          ))}
        </div>
      )}
    </article>
  );
}

export function SujetSyncNotice({ error }: { error: boolean }) {
  if (!error) return null;
  return (
    <div role="status" className="col-span-full flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-coral bg-coral/10 p-4 text-ink">
      <p className="font-semibold">تعذّر تحديث المواضيع. قد تكون البيانات المعروضة غير محدّثة.</p>
      <button type="button" onClick={refreshSujets} className="rounded-xl border-2 border-ink bg-paper px-4 py-2 font-bold">
        إعادة المحاولة
      </button>
    </div>
  );
}
