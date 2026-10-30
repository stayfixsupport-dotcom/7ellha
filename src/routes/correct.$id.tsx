import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, LoaderCircle, Save, Send, X } from 'lucide-react';
import { FancyButton } from '@/components/ui/fancy-button';
import { MathText } from '@/components/MathText';
import { useStore, getState, setState, flushStore, getOfflineAnswerPages, type OfflineAnswerPage, type Submission } from '@/lib/store';
import type { Sujet } from '@/lib/data';
import { normalizedMark, validMark, type Correction } from '@/lib/grading';

export const Route = createFileRoute('/correct/$id')({
  head: () => ({ meta: [
    { title: 'تصحيح الإجابات — حلّها' },
    { name: 'description', content: 'تصحيح إجابات التلاميذ مع توزيع النقاط والملاحظات ونشر العلامة من عشرين.' },
    { name: 'robots', content: 'noindex, nofollow' },
    { property: 'og:title', content: 'تصحيح الإجابات — حلّها' },
    { property: 'og:description', content: 'مساحة الأستاذ لتقييم الإجابات ونشر الملاحظات.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: CorrectPage,
});

function CorrectPage() {
  const { id } = Route.useParams();
  const role = useStore((s) => s.role);
  const submission = useStore((s) => s.submissions.find((x) => x.id === id));
  const sujet = useStore((s) => s.sujets.find((x) => x.id === submission?.sujetId));
  if (role !== 'teacher') return <main className="grid min-h-svh place-content-center gap-4 p-6 text-center"><h1 className="text-3xl">التصحيح متاح للأستاذ فقط</h1><Link to="/student">العودة للرئيسية</Link></main>;
  if (!submission || !sujet) return <main className="grid min-h-svh place-content-center gap-4 p-6"><h1 className="text-3xl">الإجابة غير موجودة</h1><Link to="/teacher">العودة للرئيسية</Link></main>;
  return <CorrectionEditor key={id} submission={submission} sujet={sujet} />;
}

function CorrectionEditor({ submission, sujet }: { submission: Submission; sujet: Sujet }) {
  const navigate = useNavigate();
  const questions = sujet.exercises.flatMap((exercise) => exercise.questions.map((q) => ({ ...q, exercise })));
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>(submission.correction?.scores ?? {});
  const [comments, setComments] = useState<Record<string, string>>(submission.correction?.comments ?? {});
  const [note, setNote] = useState(submission.correction?.note ?? '');
  const [override, setOverride] = useState<string>(submission.correction ? String(submission.correction.mark) : '');
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [offlinePages, setOfflinePages] = useState<OfflineAnswerPage[]>([]);
  const [offlinePagesLoading, setOfflinePagesLoading] = useState(submission.delivery === 'offline');
  const [offlinePagesError, setOfflinePagesError] = useState(false);
  const question = questions[index];
  const evaluated = questions.filter((q) => scores[q.id] !== undefined).length;
  const calculated = normalizedMark(sujet, scores);
  const mark = override === '' ? calculated : Number(override);
  const persistDraft = (patch: Partial<Pick<Correction, 'scores' | 'comments' | 'note' | 'mark'>>) => {
    const nextScores = patch.scores ?? scores;
    const nextComments = patch.comments ?? comments;
    const nextNote = patch.note ?? note;
    const requestedMark = patch.mark ?? mark;
    const correction: Correction = {
      scores: nextScores,
      comments: nextComments,
      mark: validMark(requestedMark) ? requestedMark : normalizedMark(sujet, nextScores),
      note: nextNote.trim(),
    };
    setState((st) => ({ submissions: st.submissions.map((item) => item.id === submission.id ? { ...item, correction } : item) }));
  };
  useEffect(() => {
    if (submission.delivery !== 'offline') return;
    let active = true;
    void getOfflineAnswerPages(submission.id).then((pages) => {
      if (active) setOfflinePages(pages);
    }).catch(() => {
      if (active) setOfflinePagesError(true);
    }).finally(() => {
      if (active) setOfflinePagesLoading(false);
    });
    return () => { active = false; };
  }, [submission.delivery, submission.id]);
  const save = async (publish: boolean) => {
    if (!validMark(mark)) { setMessage('العلامة يجب أن تكون بين 0 و20'); return; }
    if (publish && evaluated < questions.length) { setMessage('صحّح كل الأسئلة قبل نشر العلامة'); return; }
    setBusy(true); setMessage('');
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const correction: Correction = { scores, comments, mark, note: note.trim(), ...(publish ? { publishedAt: new Date().toISOString() } : {}) };
    setState((st) => ({ submissions: st.submissions.map((x) => x.id === submission.id ? { ...x, correction } : x) }));
    try { await flushStore(); }
    catch { setBusy(false); setMessage('تعذّر حفظ التصحيح في السحابة. تحقق من اتصال الإنترنت ثم حاول مجدداً.'); return; }
    setBusy(false);
    if (publish) navigate({ to: '/teacher' });
    else setMessage('تم حفظ مسودة التصحيح');
  };
  const move = (next: number) => { setIndex(Math.max(0, Math.min(questions.length - 1, next))); setMessage(''); };
  if (!question) return <main className="p-6">لا توجد أسئلة للتصحيح</main>;
  return <main className="flex h-svh flex-col overflow-hidden bg-cream">
    <header className="shrink-0 border-b-2 border-ink bg-sun px-4 py-3">
      <div className="mx-auto grid max-w-4xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <Link to="/teacher" data-sfx="back" aria-label="رجوع" className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink"><ChevronRight /></Link>
        <div className="min-w-0"><h1 className="truncate text-2xl">تصحيح · {submission.studentName}</h1><p className="truncate text-sm">{sujet.title}</p></div>
        <span dir="ltr" className="font-display text-2xl">{mark}/20</span>
      </div>
    </header>
    <div className="mx-auto w-full max-w-4xl shrink-0 overflow-x-auto px-4 py-3"><div className="flex w-max gap-2">{questions.map((q, i) => <FancyButton key={q.id} variant={i === index ? 'sun' : 'outline'} aria-label={`السؤال ${i + 1}`} onClick={() => move(i)} className="h-10 w-10 rounded-xl p-0 shadow-none">{scores[q.id] !== undefined ? <Check size={17} /> : i + 1}</FancyButton>)}</div></div>
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5">
      <AnimatePresence mode="wait"><motion.section key={index} initial={{ opacity: 0, x: -25 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 25 }} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={.08} onDragEnd={(_, info) => { if (info.offset.x > 75) move(index + 1); if (info.offset.x < -75) move(index - 1); }} className="mx-auto max-w-4xl space-y-4">
        <div className="border-b-2 border-ink/15 pb-4"><p className="font-display text-xl text-muted-foreground">{question.exercise.title} · السؤال {index + 1}</p><p className="mt-2 text-base leading-relaxed"><MathText text={question.exercise.context} /></p><h2 className="mt-3 text-xl font-bold"><MathText text={question.text} /></h2></div>
        {submission.delivery === 'offline' && <section className="space-y-3 border-b border-border pb-4">
          <h3 className="text-lg font-bold text-forest">صور الحل المكتوب · {question.exercise.title}</h3>
          {offlinePagesLoading && <p role="status" className="text-base text-muted-foreground">جارٍ تحميل الصور…</p>}
          {offlinePagesError && <p role="alert" className="text-base text-coral">تعذّر تحميل صور هذا الحل. تحقق من صلاحية العرض واتصالك.</p>}
          {!offlinePagesLoading && !offlinePagesError && offlinePages.filter((page) => page.exerciseId === question.exercise.id).length === 0 && <p className="text-base text-muted-foreground">لم تُرفق صور لهذا التمرين.</p>}
          <div className="grid gap-3 sm:grid-cols-2">{offlinePages.filter((page) => page.exerciseId === question.exercise.id).map((page) => <figure key={page.id} className="overflow-hidden rounded-xl border-2 border-ink bg-paper"><figcaption className="border-b border-border px-3 py-2 text-sm font-bold">صفحة {page.pageNumber}</figcaption><img src={page.imageData} alt={`صورة إجابة التمرين، صفحة ${page.pageNumber}`} className="max-h-[65svh] w-full object-contain" /></figure>)}</div>
        </section>}
        {submission.delivery !== 'offline' && <article className="rounded-2xl border-2 border-ink bg-paper p-4 shadow-pop"><h3 className="mb-2 text-xl">✍️ إجابة التلميذ</h3><div className="min-h-20 text-lg leading-loose"><MathText text={submission.answers[question.id]?.trim() || '— لم تتم الإجابة —'} /></div></article>}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3"><label className="min-w-0 text-base font-bold">نقاط السؤال <span dir="ltr">/{question.points}</span><input aria-label="نقاط السؤال" type="number" min="0" max={question.points} step="0.25" value={scores[question.id] ?? ''} onChange={(ev) => { const value = ev.target.value; const next = { ...scores }; if (value === '') delete next[question.id]; else next[question.id] = Math.min(question.points, Math.max(0, Number(value))); setScores(next); persistDraft({ scores: next }); }} className="mt-2 w-full rounded-xl border-2 border-ink bg-sun/30 p-3 text-xl" dir="ltr" /></label><div className="flex gap-2"><FancyButton variant="outline" aria-label="صفر" onClick={() => { const next = { ...scores, [question.id]: 0 }; setScores(next); persistDraft({ scores: next }); }} className="h-14 w-14 p-0 shadow-none"><X /></FancyButton><FancyButton variant="sun" aria-label="النقاط كاملة" onClick={() => { const next = { ...scores, [question.id]: question.points }; setScores(next); persistDraft({ scores: next }); }} className="h-14 w-14 p-0 shadow-none"><Check /></FancyButton></div></div>
        <label className="block font-bold">ملاحظة على الإجابة<textarea aria-label="ملاحظة على الإجابة" rows={2} value={comments[question.id] ?? ''} onChange={(ev) => { const next = { ...comments, [question.id]: ev.target.value }; setComments(next); persistDraft({ comments: next }); }} className="mt-2 w-full resize-y rounded-xl border-2 border-border bg-paper p-3 text-base font-normal" /></label>
      </motion.section></AnimatePresence>
    </div>
    <footer className="shrink-0 border-t-2 border-ink bg-paper px-4 py-3"><div className="mx-auto flex max-w-4xl items-center justify-between gap-2"><FancyButton variant="outline" aria-label="السؤال السابق" disabled={index === 0} onClick={() => move(index - 1)} className="px-3 shadow-none"><ChevronRight /></FancyButton><FancyButton variant="outline" disabled={busy} onClick={() => save(false)} className="px-3 text-sm shadow-none">{busy ? <LoaderCircle className="animate-spin" size={18} /> : <Save size={18} />} حفظ</FancyButton>{index < questions.length - 1 ? <FancyButton variant="sun" onClick={() => move(index + 1)} className="px-3">التالي <ChevronLeft size={18} /></FancyButton> : <FancyButton variant="sun" onClick={() => { setReview(true); setMessage(''); }} className="px-3">العلامة <Check size={18} /></FancyButton>}</div>{message && !review && <p role="status" className="mt-2 text-center text-sm">{message}</p>}</footer>
    {review && <div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4"><section role="dialog" aria-label="نشر التصحيح" className="max-h-[90svh] w-full max-w-md overflow-y-auto rounded-3xl border-4 border-ink bg-sun p-5 shadow-pop"><div className="flex items-center justify-between"><h2 className="text-3xl">🏅 العلامة النهائية</h2><FancyButton variant="outline" data-sfx="back" aria-label="إغلاق" className="h-9 w-9 p-0 shadow-none" onClick={() => setReview(false)}><X size={18} /></FancyButton></div><p className="mt-3 font-bold">العلامة المحسوبة: <span dir="ltr">{calculated}/20</span></p><label className="mt-4 block font-bold">العلامة من 20<input aria-label="العلامة من 20" type="number" min="0" max="20" step="0.1" value={override} placeholder={String(calculated)} onChange={(ev) => { setOverride(ev.target.value); const parsed = Number(ev.target.value); persistDraft({ mark: validMark(parsed) ? parsed : calculated }); }} className="mt-2 w-full rounded-xl border-2 border-ink bg-paper p-3 text-2xl" dir="ltr" /></label><label className="mt-4 block font-bold">ملاحظتك للتلميذ<textarea aria-label="ملاحظتك للتلميذ" rows={3} value={note} onChange={(ev) => { setNote(ev.target.value); persistDraft({ note: ev.target.value }); }} className="mt-2 w-full rounded-xl border-2 border-ink bg-paper p-3 font-normal" /></label>{message && <p role="alert" className="mt-3 font-bold text-coral">{message}</p>}<FancyButton variant="ink" disabled={busy} onClick={() => save(true)} className="mt-4 w-full">{busy ? <LoaderCircle className="animate-spin" /> : <Send size={20} />} نشر العلامة</FancyButton></section></div>}
  </main>;
}