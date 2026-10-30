import { Avatar } from "@/components/AppShell";
import type { LevelId, SubjectId } from "@/lib/data";
import type { PublicTeacher } from "@/lib/store";

export function TeacherPicker({
  teachers,
  level,
  subject,
  onSelect,
  onClose,
  busy = false,
}: {
  teachers: PublicTeacher[];
  level: LevelId;
  subject: SubjectId;
  onSelect: (teacherUid: string) => void;
  onClose: () => void;
  busy?: boolean;
}) {
  const available = teachers.filter(
    (teacher) => teacher.levels.includes(level) && teacher.subjects.includes(subject),
  );

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="teacher-picker-title"
        className="max-h-[88svh] w-full max-w-lg overflow-y-auto rounded-3xl border-4 border-ink bg-paper p-5 shadow-pop sm:p-7"
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-ink/10 pb-4">
          <div>
            <h2 id="teacher-picker-title" className="text-3xl">
              اختر أستاذ التصحيح
            </h2>
            <p className="mt-1 text-base text-muted-foreground">
              سيصل الحل إلى الأستاذ الذي تختاره، ويمكنك متابعة التصحيح من «حلولي».
            </p>
          </div>
          <button
            type="button"
            data-sfx="back"
            aria-label="إغلاق"
            disabled={busy}
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-ink bg-cream text-xl font-bold disabled:opacity-50"
          >
            ×
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {available.map((teacher) => (
            <button
              key={teacher.uid}
              type="button"
              disabled={busy}
              onClick={() => onSelect(teacher.uid)}
              className="flex min-h-16 w-full items-center gap-3 rounded-2xl border-2 border-ink bg-cream px-3 py-3 text-right transition-colors hover:bg-lime focus-visible:outline-2 focus-visible:outline-forest disabled:opacity-50"
            >
              <Avatar src={teacher.photo} name={teacher.name} className="h-12 w-12" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-bold">{teacher.name}</span>
                <span className="block text-sm text-muted-foreground">
                  أستاذ · {level.toUpperCase()}
                </span>
              </span>
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-ink bg-paper text-lg"
                aria-hidden
              >
                ←
              </span>
            </button>
          ))}
          {!available.length && (
            <div className="rounded-2xl border-2 border-dashed border-border p-5 text-center">
              <p className="font-bold">لا يوجد أستاذ معتمد لهذا المستوى والمادة حالياً.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                إجاباتك محفوظة كمسودة؛ جرّب الإرسال لاحقاً.
              </p>
            </div>
          )}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="mt-4 min-h-12 w-full rounded-xl border-2 border-ink px-4 py-2 font-bold disabled:opacity-50"
        >
          العودة إلى الحل
        </button>
      </section>
    </div>
  );
}
