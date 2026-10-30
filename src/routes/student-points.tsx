import { createFileRoute } from "@tanstack/react-router";
import { ActivityPage, activityHead } from "@/components/ActivityPages";
export const Route = createFileRoute("/student-points")({ head: () => activityHead("نقاط", "رصيد نقاط التلميذ وسجل إنجازاته وحلوله المرسلة."), component: () => <ActivityPage kind="points" /> });