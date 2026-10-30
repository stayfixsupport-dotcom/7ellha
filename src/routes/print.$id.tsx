import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/brand";
import { FancyButton } from "@/components/ui/fancy-button";
import { getSujetSourcePages, useStore, type SujetSourcePage } from "@/lib/store";
import { useEffect, useRef, useState } from "react";
import { Award, Download, FileText, LoaderCircle, PenLine, Printer, Share2 } from "lucide-react";
import { MathText } from "@/components/MathText";
import { downloadExamPdf, exportExamPdf, shareExamPdf } from "@/lib/pdf";
import { levelOf, subjectOf } from "@/lib/data";
import { answerDirection } from "@/lib/text-direction";

export const Route = createFileRoute("/print/$id")({
  head: () => ({
    meta: [
      { title: "ورقة الإجابة — حلّها" },
      { name: "description", content: "ورقة الموضوع وإجابات التلميذ جاهزة للطباعة." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "ورقة الإجابة — حلّها" },
      { property: "og:description", content: "طباعة الموضوع والإجابات." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrintPage,
});

function PrintPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const role = useStore((s) => s.role);
  const sub = useStore((s) => s.submissions.find((x) => x.id === id));
  const sujet = useStore((s) => s.sujets.find((x) => x.id === sub?.sujetId));
  const sheet = useRef<HTMLElement>(null);
  const [busy, setBusy] = useState(false);
  const [readyPdf, setReadyPdf] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sourcePages, setSourcePages] = useState<SujetSourcePage[]>([]);
  const [sourcePagesLoading, setSourcePagesLoading] = useState(false);
  const [sourcePagesError, setSourcePagesError] = useState("");
  useEffect(() => {
    let active = true;
    if (!sujet?.sourcePageCount) {
      setSourcePages([]);
      setSourcePagesError("");
      setSourcePagesLoading(false);
      return () => { active = false; };
    }

    const expectedPageCount = sujet.sourcePageCount;
    setSourcePagesLoading(true);
    setSourcePagesError("");
    getSujetSourcePages(sujet.id).then((pages) => {
      if (!active) return;
      setSourcePages(pages);
      if (pages.length < expectedPageCount) {
        setSourcePagesError("لم تُحمّل كل صفحات النسخة الأصلية؛ ستظهر الأسئلة المستخرجة بدلاً منها.");
      }
    }).catch((loadError: unknown) => {
      if (!active) return;
      console.error("Original sujet pages failed to load for print", loadError);
      setSourcePages([]);
      setSourcePagesError("تعذّر تحميل النسخة الأصلية؛ ستظهر الأسئلة المستخرجة بدلاً منها.");
    }).finally(() => {
      if (active) setSourcePagesLoading(false);
    });
    return () => { active = false; };
  }, [sujet?.id, sujet?.sourcePageCount]);
  if (!sub || !sujet) return <div className="grid min-h-screen place-items-center text-2xl">الورقة غير موجودة</div>;
  const correction = sub.correction?.publishedAt ? sub.correction : undefined;
  const exportPdf = async () => {
    if (!sheet.current || busy) return;
    if (sourcePagesLoading) {
      setError("انتظر اكتمال تحميل صفحات الموضوع قبل تجهيز PDF.");
      return;
    }
    if (readyPdf) {
      try { await downloadExamPdf(readyPdf, `حلّها-${sub.id}.pdf`); }
      catch { setError("تعذّر تنزيل الملف، حاول مجدداً"); }
      return;
    }
    setBusy(true); setError("");
    try { setReadyPdf(await exportExamPdf(sheet.current, `حلّها-${sub.id}.pdf`)); }
    catch { setError("تعذّر إنشاء الملف، حاول مجدداً"); }
    finally { setBusy(false); }
  };
  const sharePdf = async () => {
    if (busy) return;
    if (!readyPdf) {
      if (!sheet.current) return;
      setBusy(true); setError(""); setMessage("");
      try {
        setReadyPdf(await exportExamPdf(sheet.current, `حلّها-${sub.id}.pdf`));
        setMessage("تم تجهيز ملف PDF. اضغط «مشاركة» مرة أخرى لإرساله.");
      } catch {
        setError("تعذّر إنشاء الملف، حاول مجدداً");
      } finally { setBusy(false); }
      return;
    }

    setBusy(true); setError(""); setMessage("");
    try {
      const result = await shareExamPdf(readyPdf, `حلّها-${sub.id}.pdf`);
      if (result === "shared") setMessage("تم فتح خيارات مشاركة الملف.");
      if (result === "downloaded") setMessage("المشاركة المباشرة غير متاحة هنا؛ تم تنزيل PDF لتتمكن من إرساله.");
    } catch {
      setError("تعذّرت مشاركة الملف أو تنزيله، حاول مجدداً.");
    } finally { setBusy(false); }
  };

  return (
    <main className="min-h-[100svh] bg-ink/90 px-3 py-6 sm:py-10">
      <div className="no-print mx-auto mb-5 max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <FancyButton data-sfx="back" variant="ghost" onClick={() => void navigate({ to: role === "teacher" ? "/teacher" : "/student" })}>→ رجوع</FancyButton>
          <div className="flex gap-1.5 sm:gap-2">
            <FancyButton variant="sun" aria-label={readyPdf ? "تنزيل PDF" : "تجهيز PDF"} disabled={busy} onClick={() => void exportPdf()} className="px-3">{busy ? <LoaderCircle className="animate-spin" /> : <Download />}<span>{readyPdf ? "تنزيل PDF" : "PDF"}</span></FancyButton>
            <FancyButton data-sfx="none" variant="sun" aria-label="مشاركة ملف PDF" title="مشاركة ملف PDF" disabled={busy} onClick={() => void sharePdf()} className="px-2 sm:px-3">{busy ? <LoaderCircle className="animate-spin" /> : <Share2 />}<span className="hidden sm:inline">مشاركة</span></FancyButton>
            <FancyButton variant="sun" aria-label="طباعة" onClick={() => window.print()} className="px-2 sm:px-3"><Printer /></FancyButton>
          </div>
        </div>
        {error && <p role="alert" className="mt-3 text-cream">{error}</p>}
        {message && <p role="status" className="mt-3 text-cream">{message}</p>}
        {sourcePagesError && <p role="status" className="mt-3 text-cream">{sourcePagesError}</p>}
      </div>
      <article ref={sheet} className="print-sheet mx-auto max-w-3xl overflow-hidden rounded-3xl bg-paper shadow-soft">
        <div className="pdf-section"><header className="relative overflow-hidden bg-forest p-6 text-cream sm:p-8">
          <div className="absolute -top-16 -left-16 h-48 w-48 rounded-full bg-lime/30" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="rounded-2xl bg-paper px-3 py-1"><Logo className="h-12 sm:h-12" /></div>
            <div className="text-left text-sm"><div>الجمهورية الجزائرية الديمقراطية الشعبية</div><div className="opacity-70">{sub.sentAt}</div></div>
          </div>
          <h1 className="relative mt-6 text-3xl sm:text-4xl">{sujet.title}</h1>
          <div className="relative mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {[["التلميذ", sub.studentName], ["المستوى", levelOf(sujet.level).short], ["المادة", subjectOf(sujet.subject).name], ["المدة", sujet.duration]].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-paper/10 px-3 py-2"><div className="text-xs opacity-70">{k}</div><div className="truncate font-bold">{v}</div></div>
            ))}
          </div>
        </header>
        <div className="p-6 sm:p-8">
          <h2 className="mb-4 inline-flex items-center gap-2 rounded-full bg-sun px-4 py-1 text-xl text-ink"><FileText className="h-5 w-5" /> الموضوع الأصلي</h2>
          {sourcePagesLoading && <p className="py-6 text-center text-muted-foreground">جارٍ تحميل صفحات النسخة الأصلية…</p>}
          {sourcePages.length > 0 ? sourcePages.map((page) => (
            <figure key={page.pageNumber} className="pdf-block source-exam-page mb-4 overflow-hidden border border-stone-300 bg-white">
              <img src={page.imageData} alt={`صفحة ${page.pageNumber} من الموضوع الأصلي`} className="block h-auto w-full" />
              <figcaption className="sr-only">الصفحة {page.pageNumber} من {sourcePages.length}</figcaption>
            </figure>
          )) : !sourcePagesLoading && sujet.exercises.map((e, ei) => (
            <section key={e.id} className="mb-6">
              <div className="pdf-block">
              <h3 className="border-b-2 border-forest pb-1 text-xl text-forest">{ei + 1}. <MathText text={e.title} /></h3>
              <p className="mt-2 leading-relaxed text-ink"><MathText text={e.context} /></p>
              </div>
              <ol className="mt-2 space-y-1 text-ink">
                {e.questions.map((q, qi) => <li className="pdf-block flex items-start gap-2" key={q.id}><span className="shrink-0 font-bold text-forest">{qi + 1}.</span><div><MathText text={q.text} /> <span className="text-sm font-bold text-forest">({q.points} ن)</span></div></li>)}
              </ol>
            </section>
          ))}
        </div>
        </div><div className="page-break border-t-4 border-dashed border-forest/40" />
        <div className="pdf-section p-6 sm:p-8">
          <div className="pdf-block mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><h2 className="inline-flex w-fit items-center gap-2 rounded-full bg-lime px-4 py-2 text-xl text-ink"><PenLine className="h-5 w-5" /> ورقة الإجابة</h2><div className="flex items-center gap-2 rounded-full border-2 border-ink bg-sun px-4 py-2 font-display text-xl text-ink"><Award className="h-6 w-6" /> <span dir="ltr">{correction ? correction.mark : "..."}/20</span></div></div>
          {correction?.note && <p className="pdf-block mb-5 rounded-xl border-2 border-sun bg-sun/20 p-3"><strong>ملاحظة الأستاذ: </strong><MathText text={correction.note} /></p>}
          {sujet.exercises.map((e, ei) => (
            <section key={e.id} className="mb-8">
              <div className="pdf-block">
              <div className="flex items-center gap-3 border-b-2 border-forest pb-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-lime font-display text-lg text-ink">{ei + 1}</span>
                <h2 className="text-2xl text-forest"><MathText text={e.title} /></h2>
              </div>
              <p className="mt-3 rounded-xl bg-muted p-3 leading-relaxed text-ink"><MathText text={e.context} /></p>
              </div>
              {e.questions.map((q, qi) => {
                const answer = sub.answers[q.id]?.trim() || "— لم تتم الإجابة —";
                return <div key={q.id} className="pdf-block mt-4 break-inside-avoid">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-bold text-ink">{qi + 1}. <MathText text={q.text} /></p>
                    <span className="shrink-0 rounded-full border border-forest px-2 text-xs font-bold text-forest">{q.points} ن</span>
                  </div>
                  <div dir={answerDirection(answer)} className="exam-answer mt-2 min-h-16 whitespace-pre-wrap rounded-xl border-2 border-border bg-paper p-3 leading-loose text-ink">
                    <MathText text={answer} />
                  </div>
                  {correction && <div className="mt-2 flex flex-wrap items-start gap-2 text-sm text-forest"><span className="rounded-full bg-sun/40 px-2 py-1" dir="ltr">{correction.scores[q.id] ?? 0}/{q.points}</span>{correction.comments[q.id] && <MathText text={correction.comments[q.id] ?? ''} />}</div>}
                </div>
              })}
            </section>
          ))}
          <footer className="mt-6 flex items-center justify-between border-t-2 border-dashed border-border pt-4 text-sm text-ink">
            <span>توقيع الأستاذ: ....................</span>
          </footer>
        </div>
      </article>
    </main>
  );
}
