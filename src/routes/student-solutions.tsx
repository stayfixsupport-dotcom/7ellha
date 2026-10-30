import { createFileRoute } from "@tanstack/react-router";
import { ActivityPage, activityHead } from "@/components/ActivityPages";
export const Route = createFileRoute("/student-solutions")({ head: () => activityHead("حلول مرسلة", "تابع حلولك المرسلة وتصحيح الأستاذ وورقة إجابتك."), component: () => <ActivityPage kind="solutions" /> });