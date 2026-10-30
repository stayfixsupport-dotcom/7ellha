export type Role = "teacher" | "student";

export const LEVELS = [
  { id: "bem", name: "شهادة التعليم المتوسط", short: "BEM", color: "var(--teal)" },
  { id: "1as", name: "السنة الأولى ثانوي", short: "1AS", color: "var(--lime)" },
  { id: "2as", name: "السنة الثانية ثانوي", short: "2AS", color: "var(--sun)" },
  { id: "bac", name: "شهادة البكالوريا", short: "BAC", color: "var(--coral)" },
] as const;
export type LevelId = (typeof LEVELS)[number]["id"];

export const SUBJECTS = [
  { id: "math", name: "الرياضيات", icon: "➗", levels: ["bem", "1as", "2as", "bac"] },
  { id: "physics", name: "العلوم الفيزيائية", icon: "🔬", levels: ["bem", "1as", "2as", "bac"] },
  { id: "science", name: "علوم الطبيعة والحياة", icon: "🧬", levels: ["bem", "1as", "2as", "bac"] },
  { id: "arabic", name: "اللغة العربية", icon: "📖", levels: ["bem", "1as", "2as", "bac"] },
  { id: "french", name: "اللغة الفرنسية", icon: "🥐", levels: ["bem", "1as", "2as", "bac"] },
  { id: "english", name: "اللغة الإنجليزية", icon: "🗽", levels: ["bem", "1as", "2as", "bac"] },
  { id: "history", name: "التاريخ والجغرافيا", icon: "🌍", levels: ["bem", "1as", "2as", "bac"] },
  { id: "islamic", name: "العلوم الإسلامية", icon: "🕌", levels: ["bem", "1as", "2as", "bac"] },
  { id: "philo", name: "الفلسفة", icon: "🤔", levels: ["bac"] },
  { id: "tech", name: "التكنولوجيا", icon: "💻", levels: ["1as", "2as", "bac"] },
] as const;
export type SubjectId = (typeof SUBJECTS)[number]["id"];

export const levelName = (id: string) => LEVELS.find((l) => l.id === id)?.name ?? id;
export const levelOf = (id: string) => LEVELS.find((l) => l.id === id) ?? LEVELS[0];
export const subjectOf = (id: string) => SUBJECTS.find((s) => s.id === id) ?? SUBJECTS[0];

export type Question = { id: string; text: string; points: number };
export type Exercise = { id: string; title: string; context: string; questions: Question[] };
export type Sujet = {
  id: string; title: string; level: LevelId; subject: SubjectId; teacher: string; ownerUid?: string;
  creatorType?: Role; teacherPhoto?: string | null;
  fileType: "pdf" | "image" | "docx"; year: number; duration: string; createdAt: string; exercises: Exercise[];
  sourcePageCount?: number;
};

const q = (id: string, text: string, points = 2): Question => ({ id, text, points });

export const SEED_SUJETS: Sujet[] = [
  {
    id: "s1", title: "اختبار الفصل الأول في الرياضيات", level: "bac", subject: "math", teacher: "أ. سارة بن علي",
    fileType: "pdf", year: 2025, duration: "3 ساعات", createdAt: "2026-10-10",
    exercises: [
      { id: "e1", title: "التمرين الأول: المتتاليات", context: "نعتبر المتتالية (Uₙ) المعرفة بـ U₀ = 2 و Uₙ₊₁ = ½Uₙ + 3.", questions: [
        q("q1", "احسب U₁ و U₂."), q("q2", "برهن بالتراجع أن Uₙ < 6 من أجل كل عدد طبيعي n.", 3), q("q3", "بيّن أن المتتالية (Uₙ) متزايدة ثم استنتج أنها متقاربة.", 3) ] },
      { id: "e2", title: "التمرين الثاني: الأعداد المركبة", context: "في المستوي المركب نعتبر النقط A و B ذات اللاحقتين z_A = 1 + i و z_B = 3 − i.", questions: [
        q("q4", "اكتب z_A على الشكل الأسي."), q("q5", "عيّن طبيعة المثلث OAB.", 3) ] },
      { id: "e3", title: "التمرين الثالث: الدوال", context: "لتكن الدالة f المعرفة على ℝ بـ f(x) = (x − 1)eˣ.", questions: [
        q("q6", "احسب نهايات الدالة f عند أطراف مجموعة التعريف."), q("q7", "ادرس اتجاه تغير الدالة f وشكّل جدول تغيراتها.", 4) ] },
    ],
  },
  {
    id: "s2", title: "فرض محروس: الظواهر الكهربائية", level: "2as", subject: "physics", teacher: "أ. كريم مزيان",
    fileType: "image", year: 2025, duration: "ساعة واحدة", createdAt: "2026-10-12",
    exercises: [
      { id: "e1", title: "التمرين الأول", context: "نربط مكثفة سعتها C = 10µF على التسلسل مع ناقل أومي R = 1kΩ ومولد توتره E = 12V.", questions: [
        q("q1", "ارسم مخطط الدارة مع توجيه التيار."), q("q2", "احسب ثابت الزمن τ.", 2), q("q3", "استنتج المدة اللازمة لشحن المكثفة كلياً.", 2) ] },
      { id: "e2", title: "التمرين الثاني", context: "يتحرك جسم كتلته m = 2kg على مستوٍ أفقي أملس بسرعة ثابتة.", questions: [
        q("q4", "مثّل القوى المؤثرة على الجسم."), q("q5", "طبّق مبدأ العطالة وفسّر النتيجة.", 3) ] },
    ],
  },
  {
    id: "s3", title: "موضوع مقترح لشهادة التعليم المتوسط - العربية", level: "bem", subject: "arabic", teacher: "أ. نور الهدى",
    fileType: "docx", year: 2024, duration: "ساعتان", createdAt: "2026-10-08",
    exercises: [
      { id: "e1", title: "البناء الفكري", context: "اقرأ النص الآتي بتمعن ثم أجب عن الأسئلة: «العلم نور يضيء دروب الأمم...»", questions: [
        q("q1", "ضع عنواناً مناسباً للنص."), q("q2", "استخرج الفكرة العامة للنص.", 2), q("q3", "ما القيمة التي يدعو إليها الكاتب؟") ] },
      { id: "e2", title: "البناء اللغوي", context: "اعتمد على النص السابق.", questions: [
        q("q4", "أعرب ما تحته خط في الفقرة الأولى.", 3), q("q5", "استخرج من النص أسلوب تعجب وبيّن صيغته.") ] },
      { id: "e3", title: "الوضعية الإدماجية", context: "كتب صديقك منشوراً يقلل فيه من أهمية المطالعة.", questions: [
        q("q6", "حرّر رسالة من 10 أسطر تقنعه فيها بأهمية المطالعة.", 6) ] },
    ],
  },
  {
    id: "s4", title: "اختبار في علوم الطبيعة والحياة", level: "1as", subject: "science", teacher: "أ. سارة بن علي",
    fileType: "pdf", year: 2025, duration: "ساعتان", createdAt: "2026-10-14",
    exercises: [
      { id: "e1", title: "التمرين الأول: الخلية", context: "تمثل الوثيقة رسماً تخطيطياً لخلية حيوانية.", questions: [
        q("q1", "تعرّف على البيانات المرقمة."), q("q2", "قارن بين الخلية الحيوانية والنباتية.", 3) ] },
      { id: "e2", title: "التمرين الثاني: التنفس", context: "أجريت تجربة لقياس استهلاك O₂ عند خميرة الخبز.", questions: [
        q("q3", "حلّل منحنى التجربة."), q("q4", "اقترح فرضية تفسر النتائج.", 3) ] },
    ],
  },
  {
    id: "s5", title: "Devoir de français – le récit", level: "bem", subject: "french", teacher: "أ. كريم مزيان",
    fileType: "image", year: 2025, duration: "1h30", createdAt: "2026-10-15",
    exercises: [
      { id: "e1", title: "Compréhension de l'écrit", context: "Lisez attentivement le texte puis répondez aux questions.", questions: [
        q("q1", "Quel est le titre qui convient au texte ?"), q("q2", "Relevez les personnages principaux.") ] },
    ],
  },
];

// Fake AI classifier: keyword sniffing on filename, falls back to a deterministic pick.
const KEYWORDS: Record<string, SubjectId> = {
  math: "math", رياض: "math", physi: "physics", فيزي: "physics", scien: "science", علوم: "science",
  arab: "arabic", عرب: "arabic", fr: "french", eng: "english", hist: "history", تاريخ: "history",
  philo: "philo", فلسف: "philo", islam: "islamic",
};
const LEVEL_KW: Record<string, LevelId> = { bac: "bac", باك: "bac", bem: "bem", "1as": "1as", "2as": "2as" };

export function fakeClassify(fileName: string, hintLevels: string[], hintSubjects: string[]) {
  const n = fileName.toLowerCase();
  let subject = Object.entries(KEYWORDS).find(([k]) => n.includes(k))?.[1];
  let level = Object.entries(LEVEL_KW).find(([k]) => n.includes(k))?.[1];
  const h = [...n].reduce((a, c) => a + c.charCodeAt(0), 0);
  subject ??= (hintSubjects[h % Math.max(1, hintSubjects.length)] as SubjectId) ?? "math";
  level ??= (hintLevels[h % Math.max(1, hintLevels.length)] as LevelId) ?? "bac";
  const confidence = 86 + (h % 13);
  return { subject, level, confidence };
}

export function fakeExercises(subject: SubjectId): Exercise[] {
  const s = subjectOf(subject).name;
  return [1, 2, 3].map((i) => ({
    id: `e${i}`, title: `التمرين ${["الأول", "الثاني", "الثالث"][i - 1]}`,
    context: `نص التمرين ${i} في مادة ${s} كما تم استخراجه آلياً من الملف المرفوع.`,
    questions: [1, 2].map((j) => q(`q${i}${j}`, `السؤال ${j} من التمرين ${i}: أجب بدقة مع التعليل.`, j + 1)),
  }));
}

export const TIPS = [
  "رائع! كل إجابة تقربك من النجاح 🌱", "استمر، أنت على الطريق الصحيح 🚀", "ممتاز! ركّز وخذ نفساً عميقاً 💪",
  "نصيحة: اقرأ السؤال مرتين قبل الإجابة 👀", "أحسنت! التعليل نصف العلامة ✍️", "واو! تقدّم مذهل، واصل ✨",
  "نصيحة: ابدأ بالسؤال الأسهل لكسب الثقة 🎯", "بطل! النجاح عادة تُبنى بالتكرار 🏆",
];
