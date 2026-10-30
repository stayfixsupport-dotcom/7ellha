import { createFileRoute } from "@tanstack/react-router";
import { ActivityPage, activityHead } from "@/components/ActivityPages";
export const Route = createFileRoute("/teacher-students")({ head: () => activityHead("تلاميذ نشطون", "تابع التلاميذ الذين أرسلوا حلولاً وآخر إجاباتهم وتصحيحها."), component: () => <ActivityPage kind="students" /> });