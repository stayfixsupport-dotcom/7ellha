import { useEffect, useState } from "react";
import { getSujetSourcePages, type SujetSourcePage } from "@/lib/store";

export function OriginalSujetPages({
  sujetId,
  pageCount,
  title,
  className,
}: {
  sujetId: string;
  pageCount: number;
  title: string;
  className?: string;
}) {
  const [pages, setPages] = useState<SujetSourcePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setPages([]);
    getSujetSourcePages(sujetId)
      .then((result) => {
        if (!active) return;
        setPages(result);
        if (result.length < pageCount) {
          setError("تعذّر تحميل كل صفحات النسخة الأصلية. تحقق من الاتصال ثم أعد المحاولة.");
        }
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        console.error("Original sujet pages failed to load", loadError);
        setError("تعذّر تحميل النسخة الأصلية. تحقق من الاتصال ثم أعد المحاولة.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sujetId, pageCount, attempt]);

  return (
    <section className={className ?? "mx-auto w-full max-w-3xl"} aria-label="صفحات الموضوع الأصلي">
      {title && <h2 className="mb-3 text-xl font-bold text-forest">{title}</h2>}
      {loading && (
        <p role="status" className="py-8 text-center text-muted-foreground">
          جارٍ تحميل صفحات الموضوع…
        </p>
      )}
      {error && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-coral/15 p-3 text-sm font-bold text-coral">
          <p role="alert">{error}</p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="rounded-lg border border-coral px-3 py-2"
          >
            أعد المحاولة
          </button>
        </div>
      )}
      <div className="original-pdf-pages space-y-4">
        {pages.map((page) => (
          <figure
            key={page.pageNumber}
            className="source-exam-page mx-auto overflow-hidden border border-stone-300 bg-white shadow-sm"
          >
            <img
              src={page.imageData}
              alt={`${title}، الصفحة ${page.pageNumber}`}
              className="block h-auto w-full"
              decoding="async"
              loading={page.pageNumber === 1 ? "eager" : "lazy"}
            />
            <figcaption className="sr-only">
              الصفحة {page.pageNumber} من {pageCount}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
