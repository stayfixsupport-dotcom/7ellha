import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import { Backdrop, Logo } from "@/components/brand";
import { sfx } from "@/lib/fx";
import { setState } from "@/lib/store";
import { LEVELS, SUBJECTS, type Role } from "@/lib/data";
import { configuredSiteUrl, HOME_DESCRIPTION, HOME_OG_DESCRIPTION, HOME_TITLE } from "@/lib/seo";
import logoImg from "@/assets/logo.webp";
import teacherImg from "@/assets/teacher.webp";
import studentImg from "@/assets/student.webp";

export const Route = createFileRoute("/")({
  head: () => {
    const siteUrl = configuredSiteUrl();
    const softwareApplication = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "حلّها",
      alternateName: ["7ellha", "Hellha", "حلها"],
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      description: HOME_DESCRIPTION,
      inLanguage: "ar-DZ",
      ...(siteUrl ? { url: siteUrl } : {}),
      audience: {
        "@type": "EducationalAudience",
        educationalRole: ["teacher", "student"],
      },
    };

    return {
      meta: [
        { title: HOME_TITLE },
        { name: "description", content: HOME_DESCRIPTION },
        { name: "robots", content: "index, follow" },
        { property: "og:title", content: HOME_TITLE },
        { property: "og:description", content: HOME_OG_DESCRIPTION },
        { property: "og:type", content: "website" },
        ...(siteUrl ? [{ property: "og:url", content: siteUrl }] : []),
        { name: "twitter:card", content: "summary_large_image" },
        { "script:ld+json": softwareApplication },
      ],
      links: siteUrl ? [{ rel: "canonical", href: `${siteUrl}/` }] : [],
    };
  },
  component: Index,
});

function Index() {
  const [stage, setStage] = useState<"intro" | "roles">("intro");
  useEffect(() => {
    setStage(sessionStorage.getItem("7ellha-intro") === "1" ? "roles" : "intro");
  }, []);
  const done = () => { sessionStorage.setItem("7ellha-intro", "1"); setStage("roles"); };
  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-cream text-ink">
      <AnimatePresence mode="wait">
        {stage === "intro" && <Intro key="intro" onDone={done} />}
        {stage === "roles" && <Roles key="roles" />}
      </AnimatePresence>
      <section aria-labelledby="home-seo-title" className="border-t-2 border-ink/10 bg-paper px-5 py-14 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <h1 id="home-seo-title" className="max-w-4xl text-3xl leading-tight sm:text-5xl">
            حلّها 7ellha — منصة جزائرية لمشاركة السوجيات وحلّ المواضيع المدرسية
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-ink/75">
            حلّها (Hellha) مساحة تعليمية تجمع الأساتذة والتلاميذ حول مواضيع الدراسة في الجزائر. ينشر الأستاذ مواضيعه، ويجد التلميذ المواضيع المتاحة ليتمرّن على حلّ الأسئلة تفاعلياً ويتابع تقدّمه.
          </p>

          <div className="mt-10 grid gap-x-12 gap-y-9 border-t border-ink/15 pt-8 sm:grid-cols-2">
            <section aria-labelledby="home-seo-levels">
              <h2 id="home-seo-levels" className="text-2xl sm:text-3xl">من شهادة التعليم المتوسط إلى البكالوريا</h2>
              <p className="mt-3 text-base leading-relaxed text-ink/75">
                راجع مواضيع وسوجيات المستويات الدراسية الجزائرية، من شهادة التعليم المتوسط (BEM) إلى سنوات التعليم الثانوي وشهادة البكالوريا (BAC).
              </p>
              <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-base font-bold">
                {LEVELS.map((level) => <li key={level.id}>{level.name} ({level.short})</li>)}
              </ul>
            </section>

            <section aria-labelledby="home-seo-subjects">
              <h2 id="home-seo-subjects" className="text-2xl sm:text-3xl">مواضيع لمواد دراسية متعددة</h2>
              <p className="mt-3 text-base leading-relaxed text-ink/75">
                تصفّح المواضيع المنشورة حسب المادة والمستوى؛ تشمل المواد الرياضيات، والعلوم الفيزيائية، وعلوم الطبيعة والحياة، واللغات، والتاريخ والجغرافيا، ومواد أخرى.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink/60">
                {SUBJECTS.map((subject) => subject.name).join(" · ")} · سوجيات (sujets) وتمارين
              </p>
            </section>

            <section aria-labelledby="home-seo-teachers">
              <h2 id="home-seo-teachers" className="text-2xl sm:text-3xl">مساحة للأساتذة لمشاركة مواضيعهم</h2>
              <p className="mt-3 text-base leading-relaxed text-ink/75">
                يمكن للأستاذ نشر sujets واختبارات بصيغة PDF أو صورة أو DOCX؛ ثم تُمسح المواضيع وتُنظّم حسب المستوى والمادة لتصل إلى التلاميذ المهتمين.
              </p>
            </section>

            <section aria-labelledby="home-seo-students">
              <h2 id="home-seo-students" className="text-2xl sm:text-3xl">تدريب تفاعلي للتلاميذ</h2>
              <p className="mt-3 text-base leading-relaxed text-ink/75">
                اختر موضوعاً متاحاً أو موضوع أستاذك، أجب عن الأسئلة خطوة بخطوة، واحفظ إجاباتك وتابع تقدّمك. حلّها مناسبة للمراجعة والتحضير للامتحانات خلال العام الدراسي.
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

const LETTERS = ["7", "E", "L", "L", "H", "A"];
const ICONS = ["📐", "⚛️", "📚", "👩‍🏫", "🧠", "✅"];
const COLORS = ["text-lime", "text-sun", "text-coral", "text-teal", "text-lime", "text-sun"];

function Intro({ onDone }: { onDone: () => void }) {
  const [locked, setLocked] = useState(0);
  const [showLogo, setShowLogo] = useState(false);
  useEffect(() => {
    const ts: ReturnType<typeof setTimeout>[] = [];
    LETTERS.forEach((_, i) => {
      ts.push(setTimeout(() => sfx.bounce(i), 250 + i * 330));
      ts.push(setTimeout(() => { sfx.lock(i); setLocked(i + 1); }, 600 + i * 330));
    });
    ts.push(setTimeout(() => { sfx.whoosh(); setShowLogo(true); }, 2900));
    ts.push(setTimeout(() => sfx.chord(), 3300));
    ts.push(setTimeout(onDone, 5600));
    return () => ts.forEach(clearTimeout);
  }, [onDone]);

  return (
    <motion.section className="relative grid min-h-[100svh] place-items-center" exit={{ opacity: 0, y: -60, filter: "blur(12px)" }} transition={{ duration: 0.6 }}>
      <Backdrop />
      <button onClick={onDone} className="absolute top-5 left-5 z-20 rounded-full border border-ink/30 px-4 py-1.5 text-sm text-ink/70">تخطي</button>
      {/* environmental waves */}
      <svg className="absolute bottom-0 h-48 w-full" viewBox="0 0 1440 200" preserveAspectRatio="none" aria-hidden>
        {[0, 1, 2].map((i) => (
          <motion.path key={i} fill={["var(--forest)", "var(--teal)", "var(--lime)"][i]} fillOpacity={0.35 + i * 0.1}
            animate={{ d: [
              `M0 ${120 + i * 20} Q 360 ${60 + i * 20} 720 ${120 + i * 20} T 1440 ${120 + i * 20} V200 H0Z`,
              `M0 ${120 + i * 20} Q 360 ${180 - i * 10} 720 ${120 + i * 20} T 1440 ${120 + i * 20} V200 H0Z`,
            ] }} transition={{ duration: 3 + i, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }} />
        ))}
      </svg>

      <div className="relative z-10 flex flex-col items-center">
        <div aria-hidden className="mb-5 flex h-10 items-center justify-center gap-3 sm:mb-7 sm:h-14 sm:gap-5">
          {ICONS.map((icon, i) => <motion.span key={icon} className="inline-flex h-9 w-9 items-center justify-center text-2xl sm:h-12 sm:w-12 sm:text-4xl"
            initial={{ opacity: 0, y: 12, scale: 0.6 }} animate={locked > i ? { opacity: 1, y: 0, scale: 1, rotate: i % 2 ? 6 : -6 } : { opacity: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 16 }}>{icon}</motion.span>)}
        </div>
        <div dir="ltr" className="flex gap-1 sm:gap-3">
          {LETTERS.map((l, i) => (
            <div key={i} className="relative">
              <motion.span
                className={`block font-display text-[18vw] leading-none sm:text-[9rem] ${COLORS[i]}`}
                initial={{ y: -600, rotate: -30, scaleY: 1.3 }}
                animate={{ y: 0, rotate: 0, scaleY: [1.3, 0.7, 1.1, 1] }}
                transition={{ delay: 0.25 + i * 0.33, type: "spring", stiffness: 260, damping: 11, scaleY: { type: "tween", duration: 0.7, delay: 0.25 + i * 0.33 } }}
                style={{ textShadow: "0 8px 0 var(--forest)" }}
              >{l}</motion.span>
              {locked > i && (
                <>
                  <motion.span className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-lime" initial={{ scale: 0, opacity: 1 }} animate={{ scale: 4, opacity: 0 }} transition={{ duration: 1 }} />
                </>
              )}
            </div>
          ))}
        </div>
        <motion.div animate={locked === 6 ? { x: [0, -8, 8, -5, 5, 0] } : {}} transition={{ duration: 0.4 }} className="mt-5 h-28 sm:mt-6 sm:h-44">
          {showLogo && (
            <motion.img
              src={logoImg} alt="حلّها" width={1221} height={614} draggable={false}
              className="h-full w-auto max-w-full select-none object-contain"
              initial={{ scale: 0.3, opacity: 0, filter: "blur(20px)", y: 40 }} animate={{ scale: 1, opacity: 1, filter: "blur(0px)", y: 0 }}
              transition={{ type: "spring", stiffness: 140, damping: 12 }}
            />
          )}
        </motion.div>
        <p className="mt-4 max-w-2xl text-center text-sm text-ink/70 sm:text-base">
          منصة جزائرية يشارك فيها الأساتذة مواضيعهم من BEM إلى BAC، ويتدرّب التلاميذ على حلّها في مواد دراسية متعددة.
        </p>
        {showLogo && <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="mt-6 text-lg text-ink/70 sm:text-2xl">
          كل موضوع… له حلّ ✨
        </motion.p>}
      </div>
    </motion.section>
  );
}

function Roles() {
  const nav = useNavigate();
  const pick = (r: Role) => { setState(() => ({ role: r })); nav({ to: "/auth", search: { mode: "signup" } }); };
  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative min-h-[100svh] overflow-x-hidden">
      <Backdrop />
      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-5xl flex-col px-4 py-4 sm:px-6 sm:py-6">
        <div className="mt-1 text-center sm:mt-4">
          <motion.h2 initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-2xl leading-tight sm:text-5xl">مرحباً بك في</motion.h2>
          <motion.div initial={{ scale: 0.6, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 150, damping: 14 }} className="mt-1 flex justify-center">
            <Logo bounce className="w-[min(46vw,11rem)] object-contain sm:w-[min(32vw,15rem)]" />
          </motion.div>
          <motion.p initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="mt-1 text-sm text-ink/70 sm:mt-2 sm:text-lg">من أنت؟ اختر دورك لنصمّم لك التجربة المناسبة</motion.p>
        </div>
        <div className="mt-3 grid min-h-0 flex-1 auto-rows-[minmax(15rem,1fr)] gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-6">
          <RoleCard role="teacher" title="أنا أستاذ" desc="ارفع مواضيعك ودع الذكاء الاصطناعي يصنفها" img={teacherImg} bg="bg-teal" tag="رفع · تصنيف · تصحيح" onPick={pick} delay={0.15} />
          <RoleCard role="student" title="أنا تلميذ" desc="حلّ المواضيع تفاعلياً وتابع تقدّمك" img={studentImg} bg="bg-sun" tag="حل · تقدّم · طباعة" onPick={pick} delay={0.3} />
        </div>
        <p className="mt-3 text-center text-sm text-ink/60 sm:mt-6">لديك حساب؟ <button className="font-bold text-forest underline" onClick={() => nav({ to: "/auth", search: { mode: "login" } })}>سجّل الدخول</button></p>
      </div>
    </motion.section>
  );
}

function RoleCard({ role, title, desc, img, bg, tag, onPick, delay }: { role: Role; title: string; desc: string; img: string; bg: string; tag: string; onPick: (r: Role) => void; delay: number }) {
  const mx = useMotionValue(0), my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]));
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]));
  return (
    <motion.button
      initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay, type: "spring", stiffness: 90 }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); mx.set((e.clientX - r.left) / r.width - 0.5); my.set((e.clientY - r.top) / r.height - 0.5); }}
      onMouseLeave={() => { mx.set(0); my.set(0); }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onPick(role)}
      className={`group relative flex h-full min-h-0 items-center overflow-hidden rounded-[2rem] border-4 border-ink ${bg} p-4 text-right text-ink shadow-pop sm:p-6`}
    >
      <div className="absolute -top-10 -left-10 h-56 w-56 animate-blob bg-paper/30" />
      <div className="absolute top-3 right-3 hidden rounded-full sm:top-6 sm:right-6 sm:block border-2 border-ink bg-paper px-3 py-1 text-xs font-bold">{tag}</div>
      <img src={img} alt={title} width={720} height={720} className="absolute -left-4 bottom-0 h-[70%] w-auto animate-floaty object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-110 sm:left-2 xl:h-[85%]" />
      <div className="relative z-10 max-w-[55%]">
        <h2 className="text-3xl sm:text-4xl xl:text-5xl">{title}</h2>
        <p className="mt-1 text-sm font-semibold opacity-80 sm:mt-2 sm:text-base">{desc}</p>
        <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-1.5 sm:mt-4 sm:px-5 sm:py-2 font-bold text-cream transition-all group-hover:gap-4">ابدأ ←</span>
      </div>
    </motion.button>
  );
}
