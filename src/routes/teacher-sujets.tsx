import { createFileRoute } from "@tanstack/react-router";
import { ActivityPage, activityHead } from "@/components/ActivityPages";
export const Route = createFileRoute("/teacher-sujets")({ head: () => activityHead("المواضيع", "تصفح مواضيع الأستاذ واعرض التمارين والأسئلة في المعاينة."), component: () => <ActivityPage kind="sujets" /> });