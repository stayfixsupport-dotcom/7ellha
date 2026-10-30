import { createFileRoute } from "@tanstack/react-router";
import { ActivityPage, activityHead } from "@/components/ActivityPages";
export const Route = createFileRoute("/student-streak")({ head: () => activityHead("سلسلة أيام", "تابع سلسلة أيام التعلم وآخر نشاطاتك في حلّها."), component: () => <ActivityPage kind="streak" /> });