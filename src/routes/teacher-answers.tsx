import { createFileRoute } from "@tanstack/react-router";
import { ActivityPage, activityHead } from "@/components/ActivityPages";
export const Route = createFileRoute("/teacher-answers")({ head: () => activityHead("إجابات مستلمة", "إجابات التلاميذ المستلمة مع متابعة التصحيح وعرض أوراق الإجابة."), component: () => <ActivityPage kind="answers" /> });