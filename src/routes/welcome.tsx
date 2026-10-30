import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Dots, Pager } from "@/components/Swiper";
import { sfx } from "@/lib/fx";
import { getState, useStore } from "@/lib/store";
import teacherImg from "@/assets/teacher-home.webp";
import studentImg from "@/assets/student-home.webp";
import aiImg from "@/assets/ai-scan.webp";
import trophyImg from "@/assets/trophy.webp";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "مرحباً بك — جولة سريعة في حلّها" },
      { name: "description", content: "تعرّف على مزايا حلّها في جولة تفاعلية قصيرة." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "جولة في حلّها" },
      { property: "og:description", content: "كيف يعمل حلّها للأساتذة والتلاميذ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Welcome,
});

type Slide = { bg: string; fg: string; ring: string; tag: string; title: string; body: string; img?: string; emoji?: string[] };
const SLIDES: Record<"teacher" | "student", Slide[]> = {
  teacher: [
    { bg: "bg-forest", fg: "text-cream", ring: "bg-lime", tag: "مرحباً أستاذ", title: "مكانك لمشاركة العلم", body: "حلّها يجمعك بتلاميذ الجزائر من BEM إلى البكالوريا.", img: teacherImg },
    { bg: "bg-teal", fg: "text-ink", ring: "bg-sun", tag: "ارفع بسهولة", title: "صورة، PDF أو Word", body: "اسحب موضوعك وأفلته… هذا كل شيء.", emoji: ["📄", "🖼️", "📝"] },
    { bg: "bg-ink", fg: "text-cream", ring: "bg-teal", tag: "الذكاء الاصطناعي", title: "تصنيف وتقطيع تلقائي", body: "يحدد المستوى والمادة ويحوّل كل سؤال إلى خانة إجابة.", img: aiImg },
    { bg: "bg-coral", fg: "text-cream", ring: "bg-sun", tag: "تابع وصحّح", title: "إجابات تلاميذك بين يديك", body: "اطّلع على الحلول واطبعها بتصميم أنيق.", img: trophyImg },
  ],
  student: [
    { bg: "bg-sun", fg: "text-ink", ring: "bg-coral", tag: "أهلاً يا بطل", title: "مواضيع مستواك كلها هنا", body: "BEM، 1AS، 2AS و BAC — مرتبة حسب المادة.", img: studentImg },
    { bg: "bg-forest", fg: "text-cream", ring: "bg-lime", tag: "حلّ تفاعلي", title: "لكل سؤال خانته", body: "أجب تمريناً بتمرين مع شريط تقدّم حتى 100%.", emoji: ["✍️", "🧮", "⚛️"] },
    { bg: "bg-teal", fg: "text-ink", ring: "bg-sun", tag: "تحفيز مستمر", title: "نصائح بعد كل إجابة", body: "رسائل وتشجيعات تبقيك متحمساً حتى النهاية.", emoji: ["💡", "🔥", "🎯"] },
    { bg: "bg-coral", fg: "text-cream", ring: "bg-lime", tag: "أرسل واطبع", title: "حلّك… بتصميم احترافي", body: "أرسل إجابتك للأستاذ واطبعها في ورقة أنيقة.", img: trophyImg },
  ],
};

function Welcome() {
  const role = useStore((s) => s.role) ?? "student";
  const slides = SLIDES[role];
  const [i, setI] = useState(0);
  const nav = useNavigate();
  const go = (n: number) => { sfx.bounce(n); setI(n); };
  const finish = () => {
    sfx.success();
    if (role === "teacher") nav({ to: getState().teacher ? "/teacher" : "/teacher-setup" });
    else nav({ to: "/student" });
  };
  const s = slides[i]!;
  return (
    <main className={`relative h-[100svh] overflow-hidden transition-colors duration-700 ${s.bg} ${s.fg}`}>
      <Pager index={i} onIndex={go} count={slides.length}>
        <div className="mx-auto flex h-full max-w-5xl flex-col justify-center gap-4 px-6 pt-16 pb-36 sm:gap-6 md:flex-row-reverse md:items-center md:gap-12">
          <div className="relative mx-auto grid aspect-square w-[min(68vw,38svh,22rem)] shrink-0 place-items-center md:w-[min(26rem,60svh)]">
            <motion.div className={`absolute inset-0 animate-blob ${s.ring} opacity-90`} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }} />
            <motion.div className="absolute inset-6 rounded-full border-4 border-dashed border-current opacity-20" animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} />
            {s.img ? (
              <motion.img src={s.img} alt="" width={720} height={720} draggable={false} className="relative h-[92%] w-auto animate-floaty object-contain drop-shadow-2xl"
                initial={{ y: 60, opacity: 0, scale: 0.7 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: 0.15, type: "spring" }} />
            ) : (
              <div className="relative h-full w-full">
                {s.emoji!.map((e, k) => (
                  <motion.span key={k} className="absolute grid h-24 w-24 place-items-center rounded-3xl border-4 border-ink bg-paper text-5xl shadow-pop sm:h-28 sm:w-28"
                    style={{ top: ["12%", "40%", "62%"][k], left: ["14%", "52%", "18%"][k] }}
                    initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: [-8, 6, -4][k] ?? 0, y: [0, -12, 0] }}
                    transition={{ delay: 0.15 + k * 0.12, type: "spring", y: { duration: 3 + k, repeat: Infinity } }}>{e}</motion.span>
                ))}
              </div>
            )}
          </div>
          <div className="text-right">
            <motion.span initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="inline-block rounded-full border-2 border-current px-4 py-1 text-sm font-bold">{s.tag}</motion.span>
            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-3 text-4xl leading-[1.2] sm:text-6xl lg:text-7xl">{s.title}</motion.h1>
            <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-3 max-w-md text-lg font-medium opacity-85 sm:text-xl">{s.body}</motion.p>
          </div>
        </div>
      </Pager>

      <button onClick={finish} className="absolute top-5 left-5 z-20 rounded-full border-2 border-current px-4 py-1.5 text-sm font-bold">تخطي</button>
      <div className="absolute top-6 right-6 z-20 font-display text-2xl">{i + 1}/{slides.length}</div>
      <div className="absolute inset-x-0 bottom-0 z-20 mx-auto flex max-w-5xl items-center justify-between px-6 pb-8">
        <Dots count={slides.length} index={i} onIndex={go} />
        <motion.button data-sfx="none" aria-label="التالي" whileTap={{ scale: 0.9 }} onClick={() => (i < slides.length - 1 ? go(i + 1) : finish())}
          className="relative grid h-16 w-16 place-items-center rounded-full border-4 border-ink bg-paper text-2xl text-ink shadow-pop">
          <svg className="absolute -inset-2 h-20 w-20 -rotate-90" viewBox="0 0 80 80"><motion.circle cx="40" cy="40" r="37" fill="none" stroke="currentColor" strokeWidth="3" className={s.fg} strokeLinecap="round" animate={{ pathLength: (i + 1) / slides.length }} /></svg>
          {i < slides.length - 1 ? "←" : "✓"}
        </motion.button>
      </div>
    </main>
  );
}
