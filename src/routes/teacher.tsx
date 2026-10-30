import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { unzipSync, strFromU8 } from "fflate";
import { AppShell, Avatar, Stat } from "@/components/AppShell";
import { LoaderCircle } from "lucide-react";
import { MathText } from "@/components/MathText";
import { Confetti } from "@/components/brand";
import { ProfilePanel } from "@/components/ProfilePanel";
import { SujetCard, SujetCardSkeleton, SujetSyncNotice } from "@/components/SujetCard";
import { FancyButton } from "@/components/ui/fancy-button";
import { sfx } from "@/lib/fx";
import {
  deleteSujetSourcePages,
  flushStore,
  getState,
  saveSujetSourcePages,
  setState,
  useStore,
} from "@/lib/store";
import { scanSujet, type ScanInput, type ScanResult } from "@/lib/scan.functions";
import { mergeScanResults, retryScanRequest, splitScanPages } from "@/lib/scan-client";
import { firebaseAuth } from "@/lib/firebase";
import {
  LEVELS,
  levelOf,
  SUBJECTS,
  subjectOf,
  type LevelId,
  type SubjectId,
  type Sujet,
} from "@/lib/data";

export const Route = createFileRoute("/teacher")({
  head: () => ({
    meta: [
      { title: "لوحة الأستاذ — حلّها" },
      {
        name: "description",
        content: "ارفع المواضيع، دع الذكاء الاصطناعي يصنفها، وتابع إجابات تلاميذك.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "لوحة الأستاذ — حلّها" },
      { property: "og:description", content: "إدارة المواضيع والإجابات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Teacher,
});

const NAV = [
  { id: "home", label: "الرئيسية", icon: "🏠" },
  { id: "sujets", label: "مواضيعي", icon: "📚" },
  { id: "scan", label: "ماسح", icon: "📷" },
  { id: "answers", label: "الإجابات", icon: "📨" },
  { id: "profile", label: "حسابي", icon: "👤" },
];

function Teacher() {
  const [tab, setTab] = useState("home");
  const [upload, setUpload] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const t = useStore((s) => s.teacher);
  const user = useStore((s) => s.user);
  const sujets = useStore((s) => s.sujets);
  const sujetsLoading = useStore((s) => s.sujetsLoading);
  const sujetsSyncError = useStore((s) => s.sujetsSyncError);
  const subs = useStore((s) => s.submissions);
  const name = t ? `أ. ${t.first} ${t.last}` : (user?.name ?? "أستاذ");
  const uid = useStore((s) => s.uid);
  const ownSujets = sujets.filter((s) => s.ownerUid === uid && s.creatorType !== "student");
  const shown = ownSujets.filter((s) => !filter || s.level === filter);
  const [deleting, setDeleting] = useState<string | null>(null);
  const del = async (id: string) => {
    if (!window.confirm("حذف هذا الموضوع وإجاباته؟")) return;
    const previous = getState();
    setDeleting(id);
    sfx.error();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    setState((st) => ({
      sujets: st.sujets.filter((x) => x.id !== id),
      submissions: st.submissions.filter((x) => x.sujetId !== id),
    }));
    try {
      await flushStore();
    } catch {
      setState(() => ({ sujets: previous.sujets, submissions: previous.submissions }));
      window.alert("تعذّر حذف الموضوع من السحابة. تحقق من الاتصال ثم حاول مجدداً.");
    }
    setDeleting(null);
  };
  const actions = (s: Sujet) => (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
      <Link
        to="/preview/$id"
        params={{ id: s.id }}
        className="rounded-2xl border-2 border-ink bg-teal py-2.5 text-center text-base font-bold"
      >
        👁 معاينة
      </Link>
      <FancyButton
        variant="outline"
        data-sfx="none"
        disabled={deleting === s.id}
        onClick={() => del(s.id)}
        aria-label="حذف"
        className="border-coral bg-coral/10 px-4 text-coral shadow-none"
      >
        {deleting === s.id ? <LoaderCircle className="animate-spin" size={20} /> : "🗑"}
      </FancyButton>
    </div>
  );

  return (
    <AppShell
      items={NAV}
      active={upload ? "scan" : tab}
      onNav={(id) => {
        if (id === "scan") setUpload(true);
        else setTab(id);
      }}
      name={name}
      sub="أستاذ"
      avatar={<Avatar src={t?.photo} name={t?.first ?? name} />}
    >
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-5 lg:px-10 lg:py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {tab === "home" && (
              <>
                <section className="relative overflow-hidden rounded-[2rem] border-2 border-ink bg-forest p-6 text-cream shadow-pop sm:p-10">
                  <div className="absolute -bottom-24 -left-10 h-72 w-72 animate-blob bg-teal/40" />
                  <div className="relative max-w-2xl">
                    <p className="text-lg font-bold text-lime">صباح الخير 👋</p>
                    <h1 className="mt-1 break-words text-4xl sm:text-6xl">{name}</h1>
                    <p className="mt-3 text-lg text-cream/85 sm:text-xl">
                      ارفع موضوعاً جديداً وسيتكفّل الذكاء الاصطناعي بتصنيفه وتقطيعه إلى أسئلة.
                    </p>
                    <FancyButton className="mt-6 text-lg" onClick={() => setUpload(true)}>
                      ⬆ رفع موضوع جديد
                    </FancyButton>
                  </div>
                </section>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                  <Link
                    to="/teacher-sujets"
                    className="rounded-3xl focus-visible:outline-2 focus-visible:outline-forest"
                  >
                    <Stat label="المواضيع" value={sujetsLoading && !sujets.length ? "…" : ownSujets.length} icon="📚" bg="bg-lime" />
                  </Link>
                  <Link
                    to="/teacher-answers"
                    className="rounded-3xl focus-visible:outline-2 focus-visible:outline-forest"
                  >
                    <Stat label="إجابات مستلمة" value={subs.length} icon="📨" bg="bg-sun" />
                  </Link>
                  <Link
                    to="/teacher-students"
                    className="col-span-2 rounded-3xl focus-visible:outline-2 focus-visible:outline-forest lg:col-span-1"
                  >
                    <Stat
                      label="تلاميذ نشطون"
                      value={new Set(subs.map((s) => s.studentEmail || s.studentName)).size}
                      icon="🎒"
                      bg="bg-teal"
                    />
                  </Link>
                </div>
                <h2 className="mt-10 text-3xl sm:text-4xl">آخر الإجابات</h2>
                <Answers limit={3} />
                <h2 className="mt-10 text-3xl sm:text-4xl">أحدث المواضيع</h2>
                <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {sujetsLoading && !sujets.length
                    ? <div role="status" aria-label="جارٍ تحميل المواضيع" aria-busy="true" className="col-span-full grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <SujetCardSkeleton key={i} actionCount={2} />)}</div>
                    : ownSujets.slice(0, 3).map((s, i) => <SujetCard key={s.id} s={s} i={i} action={actions(s)} />)}
                  <SujetSyncNotice error={sujetsSyncError} />
                </div>
              </>
            )}
            {tab === "sujets" && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <h1 className="text-4xl sm:text-5xl">مواضيعي</h1>
                  <FancyButton onClick={() => setUpload(true)}>⬆ رفع</FancyButton>
                </div>
                <div className="mt-5 flex gap-2 overflow-x-auto pb-3">
                  <Chip on={!filter} onClick={() => setFilter(null)}>
                    ✨ الكل
                  </Chip>
                  {LEVELS.map((l) => (
                    <Chip key={l.id} on={filter === l.id} onClick={() => setFilter(l.id)}>
                      {l.short}
                    </Chip>
                  ))}
                </div>
                <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {sujetsLoading && !sujets.length
                    ? <div role="status" aria-label="جارٍ تحميل المواضيع" aria-busy="true" className="col-span-full grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <SujetCardSkeleton key={i} actionCount={2} />)}</div>
                    : shown.map((s, i) => <SujetCard key={s.id} s={s} i={i} action={actions(s)} />)}
                  <SujetSyncNotice error={sujetsSyncError} />
                  {!sujetsLoading && !sujetsSyncError && !shown.length && (
                    <p className="col-span-full rounded-3xl border-2 border-dashed border-border p-8 text-center text-lg text-muted-foreground">
                      لا توجد مواضيع لهذا المستوى
                    </p>
                  )}
                </div>
              </>
            )}
            {tab === "answers" && (
              <>
                <h1 className="text-4xl sm:text-5xl">إجابات التلاميذ</h1>
                <Answers />
              </>
            )}
            {tab === "profile" && <ProfilePanel role="teacher" />}
          </motion.div>
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {upload && <UploadModal onClose={() => setUpload(false)} />}
      </AnimatePresence>
    </AppShell>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-2xl border-2 border-ink px-4 py-2.5 text-base font-bold transition-all ${on ? "bg-forest text-cream shadow-pop" : "bg-paper"}`}
    >
      {children}
    </button>
  );
}

function Answers({ limit }: { limit?: number }) {
  const subs = useStore((s) => s.submissions);
  const sujets = useStore((s) => s.sujets);
  if (!subs.length)
    return (
      <p className="mt-4 rounded-3xl border-2 border-dashed border-border p-8 text-center text-lg text-muted-foreground">
        لا توجد إجابات بعد
      </p>
    );
  const list = [...subs].reverse().slice(0, limit ?? subs.length);
  return (
    <div className="mt-4 space-y-3">
      {list.map((x, i) => {
        const s = sujets.find((y) => y.id === x.sujetId);
        if (!s) return null;
        const total = s.exercises.reduce((a, e) => a + e.questions.length, 0);
        const done = Object.values(x.answers).filter((v) => v.trim()).length;
        return (
          <motion.div
            key={x.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-3xl border-2 border-ink bg-paper p-4 shadow-pop sm:grid-cols-[auto_minmax(0,1fr)_auto]"
          >
            <Avatar name={x.studentName} className="h-12 w-12" />
            <div className="min-w-0">
              <div className="truncate text-lg font-bold">{x.studentName}</div>
              <div className="truncate text-base text-muted-foreground">
                {s.title} · {levelOf(s.level).short} · {done}/{total} إجابة · {x.sentAt}
              </div>
            </div>
            <div className="col-span-2 flex flex-wrap gap-2 sm:col-span-1">
              <Link
                to="/correct/$id"
                params={{ id: x.id }}
                className="flex-1 rounded-2xl border-2 border-ink bg-sun px-4 py-2.5 text-center text-base font-bold text-ink"
              >
                ✍️{" "}
                {x.correction?.publishedAt
                  ? `تعديل ${x.correction.mark}/20`
                  : x.correction
                    ? "أكمل التصحيح"
                    : "تصحيح"}
              </Link>
              <Link
                to="/print/$id"
                params={{ id: x.id }}
                className="rounded-2xl border-2 border-ink bg-paper px-3 py-2.5 text-center"
                aria-label="عرض وطباعة"
              >
                🖨
              </Link>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

const SCAN_STEPS = [
  "قراءة الملف",
  "التعرف على النص (OCR)",
  "تحديد المستوى والمادة",
  "تقطيع التمارين والأسئلة",
];

function readDataUrl(f: File): Promise<string> {
  return new Promise((ok, no) => {
    const r = new FileReader();
    r.onload = () => ok(r.result as string);
    r.onerror = no;
    r.readAsDataURL(f);
  });
}
/** Downscale big photos so they upload fast. */
async function compressImage(f: File): Promise<string> {
  const url = URL.createObjectURL(f);
  const img = new Image();
  img.src = url;
  await img.decode();
  const k = Math.min(1, 2000 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = img.width * k;
  c.height = img.height * k;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("تعذّر معالجة الصورة");
  ctx.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return c.toDataURL("image/jpeg", 0.85);
}
async function docxText(f: File): Promise<string> {
  const files = unzipSync(new Uint8Array(await f.arrayBuffer()), {
    filter: (x) => x.name === "word/document.xml",
  });
  const documentXml = files["word/document.xml"];
  if (!documentXml) throw new Error("ملف Word غير صالح");
  const xml = strFromU8(documentXml);
  return xml
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}

export function UploadModal({
  onClose,
  creatorRole = "teacher",
}: {
  onClose: () => void;
  creatorRole?: "teacher" | "student";
}) {
  const t = useStore((s) => s.teacher);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<"drop" | "scan" | "result" | "error">("drop");
  const [step, setStep] = useState(0);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<ScanResult | null>(null);
  const [sourcePages, setSourcePages] = useState<string[]>([]);
  const [boom, setBoom] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const publishingRef = useRef(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase !== "scan") return;
    const id = setInterval(() => setStep((s) => Math.min(s + 1, SCAN_STEPS.length - 1)), 2200);
    return () => clearInterval(id);
  }, [phase]);

  const start = async (f?: File) => {
    if (!f) return;
    const isPdf = f.type.includes("pdf") || /\.pdf$/i.test(f.name);
    const isImg = f.type.startsWith("image/");
    const isDocx = /\.docx$/i.test(f.name);
    if (!isPdf && !isImg && !isDocx) {
      sfx.error();
      setErr("صيغة غير مدعومة. استعمل PDF أو صورة أو ملف Word (‎.docx)");
      setPhase("error");
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      sfx.error();
      setErr("الملف كبير جداً (الحد 15MB)");
      setPhase("error");
      return;
    }
    setFile(f);
    setStep(0);
    setPhase("scan");
    sfx.scan();
    try {
      let text: string | null = isDocx ? await docxText(f) : null;
      let pages:
        | {
            pages: string[];
            pageTexts: string[];
            sourcePages: string[];
            text: string;
          }
        | undefined;
      let sourcePageImages: string[] = [];
      let dataUrl: string | null = null;
      if (isPdf) {
        pages = await (await import("@/lib/scan-document")).renderPdfScanPages(f);
        sourcePageImages = pages.sourcePages;
        text = pages.text || null;
      } else if (isImg) {
        const scanImage = await compressImage(f);
        const sourceImage = await (
          await import("@/lib/scan-document")
        ).compressSourcePage(scanImage);
        dataUrl = sourceImage;
        sourcePageImages = [sourceImage];
      }
      setSourcePages(sourcePageImages);
      const idToken = await firebaseAuth?.currentUser?.getIdToken();
      if (!idToken) throw new Error("انتهت جلسة الدخول");
      const mime: ScanInput["mime"] = isPdf
        ? "application/pdf"
        : isDocx
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "image/jpeg";
      const scan = async (scanData: ScanInput) => {
        return retryScanRequest(() => scanSujet({ data: scanData }));
      };
      const common = {
        idToken,
        creatorRole,
        fileName: f.name,
        mime,
        hintLevels: t?.levels ?? [],
        hintSubjects: t?.subjects ?? [],
      };
      let result: ScanResult;
      if (pages) {
        const pageBatches = splitScanPages(pages.pages);
        const results: ScanResult[] = [];
        let pageOffset = 0;
        for (const batch of pageBatches) {
          const batchText = pages.pageTexts
            .slice(pageOffset, pageOffset + batch.length)
            .filter(Boolean)
            .join("\n")
            .slice(0, 60_000);
          const response = await scan({
            ...common,
            dataUrl: null,
            text: batchText || null,
            pages: batch,
          });
          if (!response.ok) throw new Error(response.error);
          results.push(response.result);
          pageOffset += batch.length;
        }
        result = mergeScanResults(results);
      } else {
        const response = await scan({ ...common, dataUrl, text });
        if (!response.ok) throw new Error(response.error);
        result = response.result;
      }
      setStep(SCAN_STEPS.length);
      setRes(result);
      setPhase("result");
      sfx.success();
    } catch (e) {
      console.error(e);
      sfx.error();
      setErr(
        e instanceof Error
          ? e.message
          : "تعذّر تجهيز الملف للتحليل. تحقق من الملف ثم أعد المحاولة.",
      );
      setPhase("error");
    }
  };

  const publish = async () => {
    if (!res || !file || publishingRef.current) return;
    publishingRef.current = true;
    setPublishing(true);
    let didPublish = false;
    try {
      const creatorType = creatorRole;
      const previousSujets = getState().sujets;
      const s: Sujet = {
        id: crypto.randomUUID(),
        title: res.title || "موضوع جديد",
        level: res.level as LevelId,
        subject: res.subject as SubjectId,
        teacher:
          creatorType === "student" ? "من التلاميذ" : t ? `أ. ${t.first} ${t.last}` : "أستاذ",
        ownerUid: getState().uid ?? "",
        creatorType,
        teacherPhoto: creatorType === "teacher" ? (t?.photo ?? null) : null,
        fileType: file.type.includes("pdf")
          ? "pdf"
          : file.type.startsWith("image/")
            ? "image"
            : "docx",
        ...(sourcePages.length ? { sourcePageCount: sourcePages.length } : {}),
        year: res.year || 2026,
        duration: res.duration || "ساعتان",
        createdAt: new Date().toISOString().slice(0, 10),
        exercises: res.exercises.map((e, i) => ({
          id: `e${i + 1}`,
          title: e.title,
          context: e.context,
          questions: e.questions.map((q, j) => ({
            id: `q${i + 1}_${j + 1}`,
            text: q.text,
            points: q.points ?? 0,
          })),
        })),
      };
      setState((st) => ({ sujets: [s, ...st.sujets] }));
      try {
        await flushStore();
      } catch {
        setState(() => ({ sujets: previousSujets }));
        sfx.error();
        setErr(
          creatorRole === "student"
            ? "تعذّر نشر الموضوع. تحقق من اتصال الإنترنت ثم حاول مجدداً."
            : "تعذّر نشر الموضوع في السحابة. تحقق من اتصال الإنترنت ثم حاول مجدداً.",
        );
        return;
      }
      try {
        if (sourcePages.length) await saveSujetSourcePages(s.id, sourcePages);
      } catch (error) {
        console.error("Original sujet pages failed to save", error);
        try {
          await deleteSujetSourcePages(s.id);
        } catch (cleanupError) {
          console.error("Original sujet page cleanup failed", cleanupError);
          setErr(
            "تم نشر الموضوع لكن تعذّر حفظ جميع صفحات النسخة الأصلية. احذف الموضوع وأعد رفعه بعد التحقق من الاتصال.",
          );
          return;
        }
        setState((state) => ({ sujets: state.sujets.filter((sujet) => sujet.id !== s.id) }));
        try {
          await flushStore();
        } catch (rollbackError) {
          console.error("Subject rollback failed after original pages save error", rollbackError);
          setErr(
            "تعذّر حفظ صفحات النسخة الأصلية وإلغاء نشر الموضوع. أعد تحميل الصفحة قبل المحاولة مجدداً.",
          );
          return;
        }
        setErr(
          "تعذّر حفظ صفحات النسخة الأصلية؛ لم يتم نشر الموضوع. تحقق من الاتصال ثم حاول مجدداً.",
        );
        return;
      }
      setBoom((b) => b + 1);
      sfx.success();
      didPublish = true;
      setTimeout(onClose, 1200);
    } finally {
      if (!didPublish) {
        publishingRef.current = false;
        setPublishing(false);
      }
    }
  };

  const qn = res?.exercises.reduce((a, e) => a + e.questions.length, 0) ?? 0;

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-3 backdrop-blur sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={phase === "scan" || publishing ? undefined : onClose}
    >
      <Confetti fire={boom} />
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.8, y: 60 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 60 }}
        transition={{ type: "spring", damping: 20 }}
        className="relative max-h-[92svh] w-full max-w-xl overflow-y-auto rounded-[2rem] border-4 border-ink bg-paper p-5 shadow-pop sm:p-6"
      >
        {phase !== "scan" && !publishing && (
          <button
            data-sfx="back"
            onClick={onClose}
            className="absolute top-4 left-4 grid h-10 w-10 place-items-center rounded-full bg-muted font-bold"
          >
            ✕
          </button>
        )}
        <h2 className="text-3xl sm:text-4xl">رفع موضوع</h2>
        {phase === "drop" && (
          <button
            onClick={() => ref.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              void start(e.dataTransfer.files[0]);
            }}
            className={`mt-5 flex w-full flex-col items-center rounded-3xl border-4 border-dashed p-8 transition-all sm:p-10 ${drag ? "scale-[1.02] border-teal bg-teal/10" : "border-border bg-cream"}`}
          >
            <motion.span
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
              className="text-6xl"
            >
              ☁️
            </motion.span>
            <span className="mt-3 text-xl font-bold">اسحب الملف هنا أو اضغط للاختيار</span>
            <span className="mt-1 text-base text-muted-foreground">PDF · صورة · Word (‎.docx)</span>
            <div className="mt-4 flex gap-2 text-2xl">📄 🖼️ 📝</div>
          </button>
        )}
        <input
          ref={ref}
          type="file"
          hidden
          accept=".pdf,.docx,image/*"
          onChange={(e) => {
            void start(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {phase === "scan" && (
          <div className="mt-5">
            <div className="relative mx-auto h-48 w-40 overflow-hidden rounded-2xl border-2 border-ink bg-cream p-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="mb-2 h-2 rounded bg-ink/15"
                  style={{ width: `${60 + ((i * 37) % 40)}%` }}
                />
              ))}
              <div className="absolute inset-x-0 h-1 animate-scan bg-lime shadow-[0_0_20px_var(--lime)]" />
            </div>
            <p className="mt-3 truncate text-center text-base font-bold text-muted-foreground">
              {file?.name}
            </p>
            <ul className="mt-4 space-y-2">
              {SCAN_STEPS.map((s, i) => (
                <li key={s} className="flex items-center gap-3 text-lg font-semibold">
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-full border-2 border-ink text-sm ${step > i ? "bg-lime" : step === i ? "animate-pulse bg-sun" : "bg-muted"}`}
                  >
                    {step > i ? "✓" : i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-center text-base text-muted-foreground">
              الذكاء الاصطناعي يقرأ موضوعك… قد يستغرق ذلك دقيقة
            </p>
          </div>
        )}
        {phase === "error" && (
          <div className="mt-5 space-y-4 text-center">
            <div className="text-6xl">😕</div>
            <p className="rounded-2xl bg-coral/15 px-4 py-3 text-lg font-bold text-coral">{err}</p>
            <FancyButton
              className="w-full"
              onClick={() => {
                setPhase("drop");
                setErr("");
              }}
            >
              حاول بملف آخر
            </FancyButton>
          </div>
        )}
        {phase === "result" && res && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 space-y-4"
          >
            <div className="flex items-center gap-3 rounded-2xl bg-lime/30 p-3 text-lg font-bold">
              ✓ تم التحليل — {res.exercises.length} تمارين و {qn} سؤال
            </div>
            <label className="block">
              <span className="text-base font-bold">العنوان</span>
              <input
                value={res.title}
                onChange={(e) => setRes({ ...res, title: e.target.value })}
                className="mt-1 w-full rounded-xl border-2 border-ink bg-cream px-3 py-3 text-lg font-semibold outline-none"
              />
            </label>
            <div>
              <span className="text-base font-bold">المستوى المقترح</span>
              <div className="mt-1 grid grid-cols-4 gap-2">
                {LEVELS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setRes({ ...res, level: l.id })}
                    className={`rounded-xl border-2 border-ink py-2.5 font-bold ${res.level === l.id ? "bg-ink text-cream" : ""}`}
                  >
                    {l.short}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="text-base font-bold">
                المادة المقترحة: {subjectOf(res.subject).icon}
              </span>
              <select
                value={res.subject}
                onChange={(e) => setRes({ ...res, subject: e.target.value })}
                className="mt-1 w-full rounded-xl border-2 border-ink bg-cream px-3 py-3 text-lg font-semibold"
              >
                {SUBJECTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="max-h-64 space-y-3 overflow-y-auto rounded-2xl border-2 border-border bg-cream p-3">
              {res.exercises.map((e, i) => (
                <div key={i}>
                  <div className="font-display text-xl text-forest">
                    <MathText text={e.title} />
                  </div>
                  <ol className="mt-1 list-decimal space-y-1 pr-5 text-base">
                    {e.questions.map((q, j) => (
                      <li key={j}>
                        <MathText text={q.text} />{" "}
                        <span className="text-muted-foreground">({q.points} ن)</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
            {!!sourcePages.length && (
              <div className="space-y-2 rounded-2xl border-2 border-border bg-cream p-3">
                <p className="font-bold">معاينة صفحات النسخة الأصلية ({sourcePages.length})</p>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {sourcePages.map((page, index) => (
                    <figure
                      key={index}
                      className="w-28 shrink-0 overflow-hidden rounded-lg border border-border bg-white sm:w-36"
                    >
                      <img
                        src={page}
                        alt={`الصفحة الأصلية ${index + 1}`}
                        className="h-40 w-full object-contain sm:h-48"
                      />
                      <figcaption className="py-1 text-center text-xs font-bold">
                        الصفحة {index + 1}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}
            {err && (
              <p role="alert" className="rounded-xl bg-coral/15 px-3 py-2 font-bold text-coral">
                {err}
              </p>
            )}
            <FancyButton
              data-sfx="none"
              className="w-full text-lg"
              aria-busy={publishing}
              disabled={publishing}
              onClick={() => void publish()}
            >
              {publishing && <LoaderCircle className="animate-spin" size={20} />}
              {publishing ? "جارٍ نشر الموضوع…" : "نشر الموضوع 🚀"}
            </FancyButton>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
