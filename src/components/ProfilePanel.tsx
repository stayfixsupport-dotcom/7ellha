import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BookOpen, ChevronLeft, Copyright, HelpCircle, LoaderCircle, ShieldCheck, Trash2 } from "lucide-react";
import { Avatar } from "@/components/AppShell";
import { FancyButton } from "@/components/ui/fancy-button";
import { sfx } from "@/lib/fx";
import { flushStore, getState, setState, useStore } from "@/lib/store";
import { LEVELS, SUBJECTS } from "@/lib/data";
import { authErrorMessage, deleteCurrentAccount } from "@/lib/firebase-auth";
import { firebaseAuth } from "@/lib/firebase";
import { profileImageData } from "@/lib/image";

type SettingsPage = "account" | "privacy" | "copyright" | "faq";

export function ProfilePanel({ role }: { role: "teacher" | "student" }) {
  const navigate = useNavigate();
  const st = getState();
  const user = useStore((s) => s.user);
  const subs = useStore((s) => s.submissions);
  const sujets = useStore((s) => s.sujets);
  const [first, setFirst] = useState(st.teacher?.first ?? user?.name.split(" ")[0] ?? "");
  const [last, setLast] = useState(st.teacher?.last ?? user?.name.split(" ").slice(1).join(" ") ?? "");
  const [photo, setPhoto] = useState<string | null>(role === "teacher" ? st.teacher?.photo ?? null : user?.photo ?? null);
  const [levels, setLevels] = useState<string[]>(st.teacher?.levels ?? []);
  const [subjects, setSubjects] = useState<string[]>(st.teacher?.subjects ?? []);
  const [level, setLevel] = useState(st.studentLevel);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [page, setPage] = useState<SettingsPage>("account");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteName, setDeleteName] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const changePage = (nextPage: SettingsPage) => {
    setPage(nextPage);
    requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const avail = SUBJECTS.filter((s) => s.levels.some((l) => levels.includes(l)));
  const name = `${first} ${last}`.trim();

  const save = async () => {
    if (first.trim().length < 2) { sfx.error(); setMsg({ ok: false, t: "الاسم قصير جداً" }); return; }
    if (role === "teacher" && (!levels.length || !subjects.length)) { sfx.error(); setMsg({ ok: false, t: "اختر مستوى ومادة واحدة على الأقل" }); return; }
    if (role === "teacher") setState((s) => ({ teacher: { photo, first: first.trim(), last: last.trim(), levels, subjects: subjects.filter((x) => avail.some((a) => a.id === x)) }, user: s.user ? { ...s.user, name } : s.user }));
    else setState((s) => ({ studentLevel: level, user: { name, email: s.user?.email ?? "", photo } }));
    try {
      await flushStore();
      sfx.success(); setMsg({ ok: true, t: "تم حفظ التغييرات ✓" });
    } catch {
      sfx.error(); setMsg({ ok: false, t: "تعذّر الحفظ في السحابة. تحقق من الاتصال ثم حاول مجدداً." });
    }
  };

  const mySubs = role === "teacher" ? subs.length : subs.filter((x) => x.studentName === user?.name).length;
  const uid = useStore((s) => s.uid);
  const ownSujets = sujets.filter((s) => s.ownerUid === uid && s.creatorType !== "student").length;

  return (
    <div ref={panelRef} className="scroll-mt-16 space-y-6">
      <h1 className="text-4xl sm:text-5xl">الإعدادات</h1>
      {page === "account" && <>
      <section className="grid gap-5 rounded-[2rem] border-2 border-ink bg-paper p-5 shadow-pop sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:p-8">
        <button data-sfx="tap" onClick={() => ref.current?.click()} className="relative mx-auto block">
          <Avatar src={photo} name={first || "؟"} className="h-28 w-28 text-4xl sm:h-32 sm:w-32" />
          <span className="absolute -bottom-1 -left-1 grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-lime text-lg">📷</span>
        </button>
        <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void profileImageData(f).then(setPhoto).catch((error: Error) => setMsg({ ok: false, t: error.message })); }} />
        <div className="min-w-0 text-center sm:text-right">
          <div className="truncate font-display text-3xl sm:text-4xl">{role === "teacher" ? `أ. ${name}` : name || "تلميذ"}</div>
          <div className="truncate text-lg text-muted-foreground">{user?.email || "—"}</div>
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            <span className="rounded-full bg-ink px-4 py-1.5 text-base font-bold text-cream">{role === "teacher" ? "أستاذ" : "تلميذ"}</span>
            <span className="rounded-full border-2 border-ink bg-sun px-4 py-1.5 text-base font-bold">{role === "teacher" ? `${ownSujets} ${ownSujets === 1 ? "موضوع" : "مواضيع"}` : `${mySubs} حل مرسل`}</span>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-[2rem] border-2 border-ink bg-paper p-5 shadow-pop sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <In label="الاسم" v={first} on={setFirst} />
          <In label="اللقب" v={last} on={setLast} />
        </div>
        {role === "student" ? (
          <div>
            <p className="mb-2 text-lg font-bold">مستواك الدراسي</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {LEVELS.map((l) => <Pick key={l.id} on={level === l.id} onClick={() => setLevel(l.id)}>{l.short} · {l.name}</Pick>)}
            </div>
          </div>
        ) : (
          <>
            <div>
              <p className="mb-2 text-lg font-bold">المستويات التي تدرّسها</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {LEVELS.map((l) => <Pick key={l.id} on={levels.includes(l.id)} onClick={() => setLevels(toggle(levels, l.id))}>{l.short}</Pick>)}
              </div>
            </div>
            {avail.length > 0 && (
              <div>
                <p className="mb-2 text-lg font-bold">المواد</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {avail.map((s) => <Pick key={s.id} on={subjects.includes(s.id)} onClick={() => setSubjects(toggle(subjects, s.id))}>{s.icon} {s.name}</Pick>)}
                </div>
              </div>
            )}
          </>
        )}
        {msg && <motion.p initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`rounded-xl px-4 py-2.5 text-base font-bold ${msg.ok ? "bg-lime/40 text-ink" : "bg-coral/20 text-coral"}`}>{msg.t}</motion.p>}
        <FancyButton data-sfx="none" className="w-full text-lg sm:w-auto" onClick={save}>حفظ التغييرات</FancyButton>
        <nav aria-label="معلومات الحساب" className="space-y-2 border-t border-border pt-4">
          <SettingsLink icon={ShieldCheck} label="الخصوصية" onClick={() => changePage("privacy")} />
          <SettingsLink icon={Copyright} label="حقوق النشر" onClick={() => changePage("copyright")} />
          <SettingsLink icon={HelpCircle} label="الأسئلة الشائعة" onClick={() => changePage("faq")} />
        </nav>
      </section>
      <section className="flex flex-col gap-4 rounded-[2rem] border-2 border-coral/50 bg-coral/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div>
          <h2 className="text-2xl">حذف الحساب</h2>
          <p className="mt-1 max-w-2xl text-base text-ink/70">سيُحذف ملفك ومواضيعك ومسوداتك وإجاباتك نهائياً. لا يمكن التراجع عن هذا الإجراء.</p>
        </div>
        <button type="button" onClick={() => { setDeleteError(""); setDeleteOpen(true); }}
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl border-2 border-coral bg-paper px-5 py-3 font-bold text-coral transition-colors hover:bg-coral hover:text-paper">
          <Trash2 size={19} aria-hidden />حذف حسابي
        </button>
      </section>
      </>}
      {page !== "account" && <button type="button" onClick={() => changePage("account")} className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-ink bg-paper px-4 py-2.5 font-bold transition-colors hover:bg-teal/20"><ChevronLeft size={19} aria-hidden />العودة إلى الحساب</button>}
      {page === "privacy" && <SettingsArticle title="الخصوصية وحماية البيانات">
        <p>تضع «حلّها» خصوصية أعضائها في صميم التجربة. توضّح هذه الصفحة نوع المعلومات التي تُستخدم، ولماذا، ومن يمكنه الاطلاع عليها.</p>
        <PolicySection title="ما الذي نستخدمه؟">
          <p>معلومات الحساب التي تقدمها، مثل الاسم والبريد الإلكتروني والصورة والمستوى الدراسي، إضافة إلى المواضيع المنشورة والإجابات التي ترسلها ومسوداتك وتصحيحات الأستاذ.</p>
          <p>تُستخدم هذه المعلومات لتشغيل حسابك، وحفظ تقدمك، وإيصال الإجابة إلى الأستاذ المعني، وعرض نتيجة التصحيح عند نشرها.</p>
        </PolicySection>
        <PolicySection title="من يمكنه الاطلاع على المحتوى؟">
          <p>معلومات ملفك ومسوداتك خاصة بحسابك. لا يطّلع الأستاذ على إجابتك قبل إرسالها؛ وبعد الإرسال، يستطيع الأستاذ المسؤول عن الموضوع مراجعتها وتصحيحها. لا يظهر التصحيح للتلميذ حتى ينشره الأستاذ.</p>
          <p>عند نشر موضوع، يصبح متاحاً لأعضاء «حلّها» ليستفيدوا منه. احذف الموضوع إذا لم تعد ترغب في عرضه.</p>
        </PolicySection>
        <PolicySection title="تحليل الملفات">
          <p>عند طلب تحليل موضوع، يُرسل الملف أو النص المستخرج منه إلى مزوّد خدمة تقني لمعالجته. إذا تعذّر إتمام التحليل، قد يُستعان بمزوّد آخر. لذلك لا ترفع مستندات شخصية أو معلومات لا تخص الموضوع.</p>
          <p>قد تخضع معالجة الملف لدى الجهة التي تنفذ التحليل لشروطها وسياسة الاحتفاظ الخاصة بها. راجع هذه الشروط عند التعامل مع محتوى حساس.</p>
        </PolicySection>
        <PolicySection title="حسابك وحقوقك">
          <p>حافظ على سرية بيانات الدخول، وسجّل الخروج عند استخدام جهاز مشترك. يمكنك تعديل بيانات ملفك من الإعدادات أو طلب حذف الحساب ومحتواه من الصفحة نفسها.</p>
          <p>حذف الحساب إجراء نهائي. نطلب تأكيد الاسم وإعادة التحقق من الهوية لحماية حسابك من الحذف غير المقصود.</p>
        </PolicySection>
      </SettingsArticle>}
      {page === "copyright" && <SettingsArticle title="حقوق الملكية الفكرية">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border pb-4">
          <span className="font-display text-4xl text-forest">حلّها</span>
          <span className="text-base font-semibold text-ink/60">منصة تعليمية جزائرية</span>
        </div>
        <PolicySection title="اسم المنصة وهويتها">
          <p>«حلّها» واسمها المكتوب «7ellha» وشعارها وتصميمها وعناصر واجهتها تمثل هوية المنصة. لا يجوز نسخها أو استخدامها بطريقة توحي بوجود اعتماد أو شراكة رسمية من دون موافقة.</p>
        </PolicySection>
        <PolicySection title="المحتوى الذي ترفعه">
          <p>تبقى حقوق الموضوع أو الصورة أو المستند لصاحبها أو للجهة التي تملكها. رفع المحتوى لا ينقل ملكيته إلى «حلّها»، لكنه يتيح عرضه داخل المنصة ومعالجته بالقدر اللازم لتقديم الخدمة.</p>
          <p>قبل الرفع أو النشر، تأكد من امتلاكك الحق أو الإذن المناسب. تقع على عاتق الرافع مسؤولية احترام حقوق المؤلف والعلامات التجارية والخصوصية، وعدم تضمين بيانات شخصية لا حاجة إليها.</p>
        </PolicySection>
        <PolicySection title="المواد التعليمية والتصحيح">
          <p>قد تتضمن المواضيع مواداً أعدّها معلمون أو جهات تعليمية أو مؤلفون آخرون. نسب المادة إلى صاحبها لا يعني أن «حلّها» تملكها أو تصادق على كل ما ورد فيها.</p>
          <p>نتائج استخراج النص والتصنيف الآلي مساعدة أولية وليست بديلاً عن مراجعة الأستاذ. راجع النص والأسئلة والعلامات قبل نشر الموضوع أو الاعتماد عليه.</p>
        </PolicySection>
        <PolicySection title="احترام الحقوق">
          <p>لا ترفع محتوى تعلم أنه منسوخ أو منشور دون إذن، ولا تحذف نسبة العمل إلى صاحبه. عند استخدام مادة لطرف آخر، أبقِ بيانات النسبة المطلوبة واضحة.</p>
          <p>يمكن لصاحب الحق طلب مراجعة محتوى يعتقد أنه ينتهك حقوقه عبر وسيلة التواصل الرسمية للمنصة، مع توضيح المادة محل الطلب وإثبات الصلة بها.</p>
        </PolicySection>
      </SettingsArticle>}
      {page === "faq" && <section className="space-y-3">
        <h2 className="text-3xl">الأسئلة الشائعة</h2>
        <Faq question="كيف أغيّر اسمي أو مستواي؟">من صفحة الحساب، عدّل بياناتك ثم اضغط «حفظ التغييرات».</Faq>
        <Faq question="من يرى إجاباتي؟">تبقى إجابتك مسودة خاصة إلى أن ترسلها. بعد الإرسال، يطّلع عليها الأستاذ المسؤول عن الموضوع، ولا يظهر لك التصحيح إلا بعد نشره.</Faq>
        <Faq question="هل يرى الأستاذ مسودتي قبل الإرسال؟">لا. المسودة مخصصة لك، ويمكنك العودة إليها ومتابعة الحل قبل الإرسال.</Faq>
        <Faq question="من يستطيع رؤية الموضوع بعد نشره؟">يستطيع أعضاء «حلّها» المسجلون تصفح الموضوع المنشور وحلّه. تأكد من حقك في مشاركة الملف قبل نشره.</Faq>
        <Faq question="هل التحليل الآلي نهائي؟">لا. التحليل يساعد على استخراج النص وتصنيفه، وقد يخطئ في الرموز أو العلامات. راجع التفاصيل وعدّلها قبل نشر الموضوع.</Faq>
        <Faq question="ما أنواع الملفات المقبولة؟">يمكنك رفع ملف PDF أو صورة أو مستند Word بصيغة DOCX. استخدم نسخة واضحة، وتجنب الملفات التي تتضمن بيانات شخصية.</Faq>
        <Faq question="لماذا لم يكتمل تحليل الملف؟">قد يكون الملف غير واضح أو كبيراً، أو قد تكون خدمة التحليل غير متاحة مؤقتاً. جرّب نسخة أوضح، ثم أعد المحاولة بعد قليل.</Faq>
        <Faq question="هل يُرسل الملف إلى جهة أخرى عند التحليل؟">قد يُعالج محتوى الملف لدى مزوّد خدمة تقني، وقد يُستخدم مزوّد بديل عند تعذّر الأول. لا ترفع محتوى حساساً لا يلزم لتحليل الموضوع.</Faq>
        <Faq question="كيف أحصل على صلاحيات الأستاذ؟">تُراجع طلبات الأستاذ قبل إتاحة النشر والتصحيح، وذلك للمحافظة على مواضيع التلاميذ وإجاباتهم.</Faq>
        <Faq question="هل يمكنني حذف حسابي؟">نعم. افتح «حذف حسابي» في إعدادات الحساب، واكتب اسمك كما يظهر ثم أكّد هويتك. الحذف نهائي ولا يمكن التراجع عنه.</Faq>
        <Faq question="هل يمكن استعادة الحساب بعد حذفه؟">لا. بعد تأكيد الحذف، لا يمكن استرجاع الحساب أو بياناته المرتبطة به.</Faq>
        <Faq question="هل أملك حقوق الموضوع الذي رفعته؟">تبقى الحقوق لصاحب المحتوى. تأكد من امتلاك الإذن اللازم قبل رفعه أو نشره.</Faq>
      </section>}
      {deleteOpen && <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/75 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) setDeleteOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="delete-account-title" className="w-full max-w-lg rounded-3xl border-4 border-ink bg-paper p-5 shadow-pop sm:p-7">
          <h2 id="delete-account-title" className="text-3xl text-coral">تأكيد حذف الحساب</h2>
          <p className="mt-3 text-base leading-relaxed">سيُحذف الحساب وكل البيانات المرتبطة به بشكل نهائي. اكتب اسم الحساب كما يظهر أدناه للمتابعة:</p>
          <p className="mt-3 rounded-xl border border-border bg-cream px-4 py-3 font-bold" dir="auto">{name}</p>
          <label className="mt-4 block text-base font-bold">اكتب اسم الحساب<input autoComplete="off" value={deleteName} onChange={(event) => setDeleteName(event.target.value)} className="mt-2 w-full rounded-xl border-2 border-ink bg-cream px-4 py-3 text-base" /></label>
          {firebaseAuth?.currentUser?.providerData.some((provider) => provider.providerId === "password") && <label className="mt-4 block text-base font-bold">كلمة المرور لتأكيد هويتك<input type="password" autoComplete="current-password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} className="mt-2 w-full rounded-xl border-2 border-ink bg-cream px-4 py-3 text-base" dir="ltr" /></label>}
          {firebaseAuth?.currentUser?.providerData.some((provider) => provider.providerId === "google.com") && <p className="mt-3 text-sm text-ink/70">سيُطلب منك تأكيد هويتك في نافذة Google.</p>}
          {deleteError && <p role="alert" className="mt-3 rounded-xl bg-coral/15 px-3 py-2 font-bold text-coral">{deleteError}</p>}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button type="button" disabled={deleting} onClick={() => setDeleteOpen(false)} className="min-h-12 rounded-xl border-2 border-ink px-4 py-2 font-bold">إلغاء</button>
            <button type="button" disabled={deleting || deleteName.trim() !== name.trim()} onClick={async () => {
              setDeleting(true); setDeleteError("");
              try { await deleteCurrentAccount(deleteName, deletePassword); await navigate({ to: "/" }); }
              catch (error) { setDeleteError(error instanceof Error && !("code" in error) ? error.message : authErrorMessage(error)); }
              finally { setDeleting(false); }
            }} className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-coral bg-coral px-4 py-2 font-bold text-paper disabled:cursor-not-allowed disabled:opacity-50">
              {deleting && <LoaderCircle size={18} className="animate-spin" aria-hidden />}{deleting ? "جارٍ الحذف…" : "حذف نهائي"}
            </button>
          </div>
        </section>
      </div>}
    </div>
  );
}

function SettingsArticle({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-5 rounded-[2rem] border-2 border-ink bg-paper p-5 shadow-pop sm:p-8"><h2 className="text-3xl sm:text-4xl">{title}</h2><div className="max-w-3xl space-y-5 text-base leading-relaxed text-ink/80">{children}</div></section>;
}

function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-2 border-b border-border pb-4 last:border-b-0 last:pb-0"><h3 className="text-xl font-bold text-forest">{title}</h3><div className="space-y-3">{children}</div></section>;
}

function SettingsLink({ icon: Icon, label, onClick }: { icon: typeof ShieldCheck; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border-2 border-ink bg-cream px-4 py-2.5 text-right text-base font-bold transition-colors hover:bg-teal/20 focus-visible:outline-2 focus-visible:outline-forest">
    <span className="flex items-center gap-3"><Icon size={19} aria-hidden />{label}</span>
    <ChevronLeft size={19} aria-hidden className="shrink-0 text-ink/60" />
  </button>;
}

function Faq({ question, children }: { question: string; children: React.ReactNode }) {
  return <details className="group border-b border-ink/15 py-4"><summary className="cursor-pointer list-none text-lg font-bold marker:hidden focus-visible:outline-2 focus-visible:outline-forest">{question}<span aria-hidden className="float-left text-xl group-open:rotate-45">+</span></summary><p className="mt-3 max-w-3xl text-base leading-relaxed text-ink/75">{children}</p></details>;
}

function In({ label, v, on }: { label: string; v: string; on: (v: string) => void }) {
  return (
    <div>
      <span className="text-base font-bold">{label}</span>
      <input value={v} onChange={(e) => on(e.target.value)} className="mt-1 w-full rounded-2xl border-2 border-ink bg-cream px-4 py-3 text-lg font-semibold outline-none focus:bg-paper" />
    </div>
  );
}
function Pick({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded-2xl border-2 border-ink px-3 py-3 text-base font-bold transition-all ${on ? "bg-forest text-cream shadow-pop" : "bg-cream"}`}>{children}</button>;
}
