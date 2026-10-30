import { createFileRoute, Link } from "@tanstack/react-router";
import { SujetPreview } from "@/components/SujetPreview";
import { activityHead } from "@/components/ActivityPages";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/preview/$id")({ head: () => activityHead("معاينة الموضوع", "عرض الموضوع وتمارينه وأسئلته للأستاذ دون إدخال إجابات."), component: Preview });
function Preview() {
  const { id } = Route.useParams();
  const sujet = useStore((s) => s.sujets.find((x) => x.id === id));
  if (!sujet) return <main className="grid min-h-svh place-content-center gap-5 bg-cream p-5 text-center"><h1 className="text-3xl">الموضوع غير موجود</h1><Link to="/teacher" data-sfx="back" className="text-lg font-bold text-forest">العودة للرئيسية</Link></main>;
  return <SujetPreview sujet={sujet} />;
}