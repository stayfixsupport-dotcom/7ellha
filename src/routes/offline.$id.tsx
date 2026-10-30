import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Download, Eye, FileImage, LoaderCircle, Printer, Trash2, Upload } from "lucide-react";
import { MathText } from "@/components/MathText";
import { FancyButton } from "@/components/ui/fancy-button";
import { offlineAnswerPageData } from "@/lib/image";
import { downloadExamPdf, exportExamPdf } from "@/lib/pdf";
import { levelOf, subjectOf } from "@/lib/data";
import {
  flushStore,
  getState,
  recordStudyActivity,
  setState,
  useStore,
  saveOfflineAnswerPages,
  saveOfflineDraftPages,
  getOfflineDraftPages,
  deleteOfflineDraftPage,
  deleteOfflineDraftPages,
  getSujetSourcePages,
  type OfflineAnswerPage,
  type Submission,
  type SujetSourcePage,
} from "@/lib/store";
import { TeacherPicker } from "@/components/TeacherPicker";

export const Route = createFileRoute("/offline/$id")({
  head: () => ({
    meta: [
      { title: "ورقة الحلّ الورقية — حلّها" },
      {
        name: "description",
        content: "نزّل ورقة الإجابة، اكتب الحل بخط اليد، ثم أرسل صور الصفحات لأستاذك.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OfflineAnswer,
});

type PreparedPage = OfflineAnswerPage & { name: string };

function OfflineAnswer() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const sujet = useStore((state) => state.sujets.find((item) => item.id === id));
  const user = useStore((state) => state.user);
  const teachers = useStore((state) => state.teachers ?? []);
  const subjectSheet = useRef<HTMLElement>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [pages, setPages] = useState<PreparedPage[]>([]);
  const [busy, setBusy] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [readyPdf, setReadyPdf] = useState<Blob | null>(null);
  const [downloadedPdf, setDownloadedPdf] = useState(false);
  const [showSheet, setShowSheet] = useState(true);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const [sent, setSent] = useState(false);
  const [chooseTeacher, setChooseTeacher] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [sourcePages, setSourcePages] = useState<SujetSourcePage[]>([]);
  const [sourcePagesLoading, setSourcePagesLoading] = useState(false);
  const [sourcePagesError, setSourcePagesError] = useState("");

  useEffect(() => {
    let active = true;
    void getOfflineDraftPages(id)
      .then((saved) => {
        if (active) setPages(saved.map((page) => ({ ...page, name: `صفحة ${page.pageNumber}` })));
      })
      .catch(() => {
        if (active)
          setNotice({
            error: true,
            text: "تعذّر تحميل مسودة الصور. تحقق من الاتصال ثم أعد فتح الموضوع.",
          });
      })
      .finally(() => {
        if (active) setDraftLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;
    if (!sujet?.sourcePageCount) {
      setSourcePages([]);
      setSourcePagesLoading(false);
      setSourcePagesError("");
      return () => {
        active = false;
      };
    }

    setSourcePagesLoading(true);
    setSourcePagesError("");
    getSujetSourcePages(sujet.id)
      .then((saved) => {
        if (!active) return;
        setSourcePages(saved);
        if (saved.length < sujet.sourcePageCount!) {
          setSourcePagesError(
            "لم تُحمّل كل صفحات النسخة الأصلية. أعد المحاولة قبل طباعة ورقة الحل.",
          );
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error("Original sujet pages failed to load for offline answer", error);
        setSourcePages([]);
        setSourcePagesError("تعذّر تحميل النسخة الأصلية. تحقق من الاتصال ثم أعد المحاولة.");
      })
      .finally(() => {
        if (active) setSourcePagesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sujet?.id, sujet?.sourcePageCount]);

  if (!sujet)
    return (
      <main className="grid min-h-svh place-items-center bg-cream p-6 text-2xl text-ink">
        الموضوع غير موجود
      </main>
    );

  const addPhotos = async (exerciseId: string, files: FileList | null) => {
    if (!files?.length || processing || !draftLoaded) return;
    const selected = Array.from(files);
    if (pages.length + selected.length > 30) {
      setNotice({ error: true, text: "الحد الأقصى 30 صورة لكل موضوع." });
      return;
    }
    setProcessing(true);
    setNotice(null);
    try {
      const firstNumber = pages.length + 1;
      const prepared: PreparedPage[] = [];
      for (const [index, file] of selected.entries()) {
        prepared.push({
          id: crypto.randomUUID(),
          exerciseId,
          pageNumber: firstNumber + index,
          name: file.name || `صفحة ${firstNumber + index}`,
          imageData: await offlineAnswerPageData(file),
        });
      }
      const combinedSize =
        pages.reduce((total, page) => total + page.imageData.length, 0) +
        prepared.reduce((total, page) => total + page.imageData.length, 0);
      if (combinedSize > 8_000_000)
        throw new Error("إجمالي الصور كبير جداً. أرسل صفحات أقل أو التقط صوراً بحجم أصغر.");
      await saveOfflineDraftPages(sujet.id, prepared);
      setPages((current) => [...current, ...prepared]);
    } catch (error) {
      setNotice({
        error: true,
        text: error instanceof Error ? error.message : "تعذّر تجهيز الصور.",
      });
    } finally {
      setProcessing(false);
    }
  };

  const makePdf = async () => {
    if (busy || !subjectSheet.current) return;
    if (sourcePagesLoading) {
      setNotice({ error: true, text: "انتظر اكتمال تحميل النسخة الأصلية قبل تجهيز ورقة الحل." });
      return;
    }
    if (sujet.sourcePageCount && sourcePages.length < sujet.sourcePageCount) {
      setNotice({
        error: true,
        text: sourcePagesError || "لم تُحمّل كل صفحات النسخة الأصلية؛ لا يمكن تجهيز ورقة حل كاملة.",
      });
      return;
    }
    if (readyPdf) {
      try {
        await downloadExamPdf(readyPdf, `حلّها-ورقة-إجابة-${sujet.id}.pdf`, { preferShare: false });
      } catch {
        setNotice({ error: true, text: "تعذّر تنزيل الملف، حاول مجدداً." });
      }
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const pdf = await exportExamPdf(subjectSheet.current, `حلّها-ورقة-إجابة-${sujet.id}.pdf`);
      setReadyPdf(pdf);
      await downloadExamPdf(pdf, `حلّها-ورقة-إجابة-${sujet.id}.pdf`, { preferShare: false });
      setDownloadedPdf(true);
      setShowSheet(false);
    } catch {
      setNotice({ error: true, text: "تعذّر تجهيز ورقة الإجابة، حاول مجدداً." });
    } finally {
      setBusy(false);
    }
  };

  const removeDraftPage = async (page: PreparedPage) => {
    try {
      await deleteOfflineDraftPage(sujet.id, page.id);
      setPages((current) => current.filter((item) => item.id !== page.id));
    } catch {
      setNotice({
        error: true,
        text: "تعذّر حذف الصورة من المسودة. تحقق من الاتصال ثم حاول مجدداً.",
      });
    }
  };

  const sendPhotos = async (teacherUid: string) => {
    const uid = getState().uid;
    if (!uid || !pages.length || busy) return;
    const submission: Submission = {
      id: crypto.randomUUID(),
      sujetId: sujet.id,
      studentUid: uid,
      teacherUid,
      studentName: user?.name ?? "تلميذ",
      ...(user?.email ? { studentEmail: user.email } : {}),
      answers: {},
      sentAt: new Date().toISOString().slice(0, 10),
      delivery: "offline",
      offlinePageCount: pages.length,
    };
    setBusy(true);
    setNotice(null);
    setState((state) => ({ submissions: [...state.submissions, submission] }));
    try {
      await flushStore();
      await saveOfflineAnswerPages(
        submission.id,
        pages.map(({ name: _name, ...page }) => page),
      );
      void deleteOfflineDraftPages(sujet.id).catch((error) =>
        console.error("Offline draft cleanup failed", error),
      );
      void recordStudyActivity(sujet.id).catch((error) =>
        console.error("Study activity sync failed", error),
      );
      setSent(true);
      setChooseTeacher(false);
      setNotice({ error: false, text: "تم إرسال صور إجاباتك للأستاذ بنجاح." });
    } catch {
      setState((state) => ({
        submissions: state.submissions.filter((item) => item.id !== submission.id),
      }));
      try {
        await flushStore();
      } catch {
        /* Keep the original send error visible. */
      }
      setNotice({ error: true, text: "تعذّر إرسال الصور. تحقق من اتصال الإنترنت ثم حاول مجدداً." });
    } finally {
      setBusy(false);
    }
  };

  const printSheet = () => {
    if (
      sourcePagesLoading ||
      (sujet.sourcePageCount && sourcePages.length < sujet.sourcePageCount)
    ) {
      setNotice({
        error: true,
        text: sourcePagesError || "انتظر اكتمال تحميل النسخة الأصلية قبل الطباعة.",
      });
      return;
    }
    window.print();
  };

  const offlineQuestions = sujet.exercises.flatMap((exercise, exerciseIndex) =>
    exercise.questions.map((question, questionIndex) => ({
      exerciseIndex,
      question,
      questionIndex,
    })),
  );
  const answerPages = Array.from(
    { length: Math.ceil(offlineQuestions.length / 2) },
    (_, pageIndex) => offlineQuestions.slice(pageIndex * 2, pageIndex * 2 + 2),
  );

  return (
    <main className="min-h-svh bg-cream pb-12 text-ink" dir="rtl">
      <header className="no-print sticky top-0 z-30 border-b-2 border-ink bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link
            to="/student"
            data-sfx="back"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-ink px-3 py-2 font-bold"
          >
            → رجوع
          </Link>
          {downloadedPdf && !showSheet && (
            <button
              type="button"
              onClick={() => setShowSheet(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-ink px-3 py-2 font-bold"
            >
              <Eye size={18} />
              إظهار ورقة الإجابة
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {showSheet && (
          <>
            <header className="no-print mb-6 flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-4">
              <div>
                <h1 className="text-3xl sm:text-4xl">
                  <MathText text={sujet.title} />
                </h1>
                <p className="mt-1 text-base text-ink/65">
                  {subjectOf(sujet.subject).name} · {levelOf(sujet.level).short} · {sujet.duration}
                </p>
              </div>
            </header>
            <div className="no-print mb-6 flex flex-wrap justify-center gap-2">
              <FancyButton
                variant="sun"
                disabled={busy || sourcePagesLoading}
                onClick={() => void makePdf()}
                className="px-4"
              >
                {busy ? (
                  <LoaderCircle className="animate-spin" size={19} />
                ) : (
                  <Download size={19} />
                )}
                {busy ? "جارٍ تجهيز PDF…" : readyPdf ? "تنزيل PDF" : "تجهيز PDF"}
              </FancyButton>
              <FancyButton
                variant="outline"
                disabled={sourcePagesLoading}
                onClick={printSheet}
                className="px-4"
              >
                <Printer size={19} />
                طباعة
              </FancyButton>
            </div>
            {sourcePagesLoading && (
              <p
                role="status"
                className="no-print mb-4 text-center font-bold text-muted-foreground"
              >
                جارٍ تحميل صفحات النسخة الأصلية…
              </p>
            )}
            {sourcePagesError && (
              <p
                role="alert"
                className="no-print mb-4 rounded-xl bg-coral/15 px-4 py-3 font-bold text-coral"
              >
                {sourcePagesError}
              </p>
            )}
          </>
        )}
        {!sent ? (
          <section className="no-print mb-8 border-y-2 border-ink py-5">
            <h2 className="text-3xl">أرسل إجاباتك المكتوبة</h2>
            <p className="mt-2 max-w-3xl text-base leading-relaxed text-ink/70">
              التقط صورة واضحة لكل صفحة، وأضفها تحت التمرين المناسب، ثم اختر أستاذاً لإرسالها إليه.
            </p>
            {!draftLoaded && (
              <p role="status" className="mt-3 text-sm font-bold text-muted-foreground">
                جارٍ استعادة مسودة الصور…
              </p>
            )}
            <div className="mt-5 space-y-4">
              {sujet.exercises.map((exercise, index) => {
                const exercisePages = pages.filter((page) => page.exerciseId === exercise.id);
                return (
                  <section
                    key={exercise.id}
                    className="border-b border-border py-4 last:border-b-0"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-xl font-bold">
                        {index + 1}. <MathText text={exercise.title} />
                      </h3>
                      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border-2 border-ink bg-paper px-4 py-2 font-bold hover:bg-teal/15">
                        <Upload size={18} aria-hidden />
                        إضافة صور
                        <input
                          ref={(node) => {
                            fileInputs.current[exercise.id] = node;
                          }}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          multiple
                          disabled={processing || busy || !draftLoaded}
                          className="sr-only"
                          onChange={(event) => {
                            void addPhotos(exercise.id, event.currentTarget.files);
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>
                    </div>
                    {exercisePages.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {exercisePages.map((page) => (
                          <figure
                            key={page.id}
                            className="relative overflow-hidden rounded-xl border-2 border-ink bg-paper"
                          >
                            <img
                              src={page.imageData}
                              alt={`صورة ${page.name}`}
                              className="h-40 w-full object-cover"
                            />
                            <figcaption className="truncate px-2 py-1 text-sm">
                              {page.name}
                            </figcaption>
                            <button
                              type="button"
                              aria-label={`حذف ${page.name}`}
                              onClick={() => void removeDraftPage(page)}
                              className="absolute left-2 top-2 grid h-9 w-9 place-items-center rounded-full border-2 border-ink bg-paper text-coral"
                            >
                              <Trash2 size={17} />
                            </button>
                          </figure>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
            <FancyButton
              data-sfx="none"
              variant="ink"
              disabled={busy || processing || !draftLoaded || !pages.length}
              onClick={() => setChooseTeacher(true)}
              className="mt-5 w-full text-lg"
            >
              {busy || processing ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <FileImage size={20} />
              )}
              {processing
                ? "جارٍ تجهيز الصور…"
                : busy
                  ? "جارٍ إرسال الإجابات…"
                  : `اختيار أستاذ وإرسال ${pages.length} صورة`}
            </FancyButton>
          </section>
        ) : (
          <section className="no-print mb-8 border-y-2 border-ink py-6 text-center">
            <h2 className="text-3xl text-forest">وصلت إجاباتك للأستاذ</h2>
            <p className="mt-2 text-base">يمكنك متابعة مواضيعك من حسابك.</p>
            <FancyButton
              variant="sun"
              onClick={() => void navigate({ to: "/student" })}
              className="mt-4"
            >
              العودة إلى المواضيع
            </FancyButton>
          </section>
        )}
        {notice && (!downloadedPdf || notice.error) && (
          <p
            role={notice.error ? "alert" : "status"}
            className={`no-print mb-5 rounded-xl px-4 py-3 font-bold ${notice.error ? "bg-coral/15 text-coral" : "bg-lime/40 text-ink"}`}
          >
            {notice.text}
          </p>
        )}

        {showSheet && (
          <article
            ref={subjectSheet}
            aria-hidden="true"
            className="offline-pdf-source print-sheet mx-auto max-w-4xl overflow-hidden rounded-2xl border-2 border-ink bg-paper shadow-pop"
          >
            <section className="pdf-section p-4 sm:p-6">
              {sourcePages.length > 0
                ? sourcePages.map((page) => (
                    <figure
                      key={page.pageNumber}
                      className="pdf-block source-exam-page mb-4 overflow-hidden border border-stone-300 bg-white"
                    >
                      <img
                        src={page.imageData}
                        alt={`صفحة ${page.pageNumber} من الموضوع الأصلي`}
                        className="block h-auto w-full"
                      />
                    </figure>
                  ))
                : sujet.exercises.map((exercise, index) => (
                    <section key={exercise.id} className="mb-6">
                      <div className="pdf-block">
                        <h3 className="border-b-2 border-forest pb-1 text-xl text-forest">
                          {index + 1}. <MathText text={exercise.title} />
                        </h3>
                        <p className="mt-2 leading-relaxed text-ink">
                          <MathText text={exercise.context} />
                        </p>
                      </div>
                      <ol className="mt-2 space-y-1 text-ink">
                        {exercise.questions.map((question, questionIndex) => (
                          <li key={question.id} className="pdf-block flex items-start gap-2">
                            <span className="shrink-0 font-bold text-forest">
                              {questionIndex + 1}.
                            </span>
                            <div>
                              <MathText text={question.text} />{" "}
                              <span className="whitespace-nowrap text-sm font-bold text-forest">
                                ({question.points} ن)
                              </span>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </section>
                  ))}
            </section>
            {answerPages.map((page, pageIndex) => (
              <section
                key={`answer-page-${pageIndex}`}
                className={`pdf-section offline-answer-page${page.length === 1 ? " is-solo" : ""}`}
              >
                {page.map(({ exerciseIndex, question, questionIndex }) => (
                  <div className="offline-answer-slot" key={question.id}>
                    <div className="offline-answer-prompt">
                      <p className="font-bold text-forest">
                        التمرين {exerciseIndex + 1} · السؤال {questionIndex + 1}
                      </p>
                      <p className="mt-1 font-semibold leading-relaxed">
                        <MathText text={question.text} />{" "}
                        <span className="whitespace-nowrap font-bold text-forest">
                          ({question.points} ن)
                        </span>
                      </p>
                    </div>
                    <div
                      className="offline-notebook mt-3 rounded-sm border border-border"
                      aria-label={`ورقة إجابة للسؤال ${questionIndex + 1} من التمرين ${exerciseIndex + 1}`}
                    />
                  </div>
                ))}
              </section>
            ))}
          </article>
        )}
      </div>
      {chooseTeacher && (
        <TeacherPicker
          teachers={teachers}
          level={sujet.level}
          subject={sujet.subject}
          busy={busy}
          onClose={() => setChooseTeacher(false)}
          onSelect={(teacherUid) => void sendPhotos(teacherUid)}
        />
      )}
    </main>
  );
}
