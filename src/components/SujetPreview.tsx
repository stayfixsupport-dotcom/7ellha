import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, FileText, Printer } from "lucide-react";
import { MathText } from "@/components/MathText";
import { OriginalSujetPages } from "@/components/OriginalSujetPages";
import { FancyButton } from "@/components/ui/fancy-button";
import { levelOf, subjectOf, type Sujet } from "@/lib/data";

export function SujetPreview({ sujet }: { sujet: Sujet }) {
  const reduced = useReducedMotion();
  const [viewingOriginal, setViewingOriginal] = useState(false);
  const questions = sujet.exercises.flatMap((e) => e.questions);
  useEffect(() => {
    document.body.classList.toggle("print-original", viewingOriginal);
    if (viewingOriginal) window.scrollTo(0, 0);
    return () => document.body.classList.remove("print-original");
  }, [viewingOriginal]);

  if (viewingOriginal && sujet.sourcePageCount) {
    return (
      <main className="original-pdf-view min-h-svh bg-ink/90 px-3 py-5 text-ink sm:px-6" dir="rtl">
        <header className="no-print mx-auto mb-5 flex max-w-5xl flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-paper p-3 shadow-pop">
          <button
            type="button"
            onClick={() => setViewingOriginal(false)}
            data-sfx="back"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-ink px-4 py-2 font-bold"
          >
            <ArrowRight size={19} /> العودة للمعاينة
          </button>
          <h1 className="min-w-0 flex-1 text-center text-lg font-bold sm:text-xl">
            النسخة الأصلية · {sujet.title}
          </h1>
          <FancyButton variant="sun" onClick={() => window.print()} className="min-h-11 px-4">
            <Printer size={19} />
            طباعة
          </FancyButton>
        </header>
        <OriginalSujetPages
          sujetId={sujet.id}
          pageCount={sujet.sourcePageCount}
          title=""
          className="original-pdf-document mx-auto w-full max-w-5xl space-y-4"
        />
      </main>
    );
  }

  return (
    <main className="min-h-svh bg-cream pb-12">
      <header className="border-b-2 border-ink bg-teal text-ink">
        <div className="mx-auto max-w-4xl px-5 py-6 sm:py-10">
          <div className="flex items-center justify-between gap-4">
            <Link
              to="/teacher"
              data-sfx="back"
              aria-label="العودة للأستاذ"
              className="grid h-11 w-11 place-items-center rounded-full border-2 border-ink bg-paper"
            >
              <ArrowRight size={22} />
            </Link>
            <span className="flex items-center gap-2 text-lg font-bold">
              <Eye size={22} /> معاينة الموضوع
            </span>
          </div>
          <p className="mt-6 text-base font-bold">
            {levelOf(sujet.level).name} · {subjectOf(sujet.subject).name}
          </p>
          <h1 className="mt-2 break-words text-3xl leading-snug sm:text-5xl">
            <MathText text={sujet.title} />
          </h1>
          <p className="mt-3 text-lg font-semibold">{sujet.teacher}</p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-base font-bold">
            <span>⏱ {sujet.duration}</span>
            <span>📚 {sujet.exercises.length} تمارين</span>
            <span>✏️ {questions.length} سؤال</span>
            <span>📅 {sujet.year}</span>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-5">
        {!!sujet.sourcePageCount && (
          <div className="border-b-2 border-border py-6">
            <button
              type="button"
              onClick={() => setViewingOriginal(true)}
              className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border-2 border-ink bg-forest px-5 py-3 text-lg font-bold text-cream shadow-pop transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            >
              <FileText size={22} />
              عرض النسخة الأصلية PDF
            </button>
          </div>
        )}
        {sujet.exercises.map((exercise, i) => (
          <motion.section
            key={exercise.id}
            initial={reduced ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.06, 0.3) }}
            className="border-b-2 border-border py-8 last:border-b-0"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-ink bg-sun font-display text-2xl">
                {i + 1}
              </span>
              <h2 className="min-w-0 text-3xl leading-snug text-forest">
                <MathText text={exercise.title} />
              </h2>
            </div>
            {exercise.context && (
              <div className="mt-5 whitespace-pre-wrap text-lg leading-loose">
                <MathText text={exercise.context} />
              </div>
            )}
            <ol className="mt-5 space-y-5">
              {exercise.questions.map((q, j) => (
                <li key={q.id} className="flex items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lime text-base font-bold">
                    {j + 1}
                  </span>
                  <div className="min-w-0 flex-1 text-lg leading-relaxed">
                    <MathText text={q.text} />{" "}
                    <span className="whitespace-nowrap text-base font-bold text-muted-foreground">
                      ({q.points} ن)
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </motion.section>
        ))}
        {!sujet.exercises.length && (
          <p className="py-12 text-center text-xl text-muted-foreground">
            لا توجد تمارين في هذا الموضوع
          </p>
        )}
      </div>
    </main>
  );
}
