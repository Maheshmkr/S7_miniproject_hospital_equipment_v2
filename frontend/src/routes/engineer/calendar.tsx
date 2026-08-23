import { createFileRoute } from "@tanstack/react-router";
import { CalendarSchedule } from "@/components/engineer/insights";

export const Route = createFileRoute("/engineer/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar & Schedule — Medixa" },
      {
        name: "description",
        content: "Weekly maintenance schedule, day agenda and on-call rotation.",
      },
      { property: "og:title", content: "Calendar & Schedule — Medixa" },
      {
        property: "og:description",
        content: "Weekly maintenance schedule, day agenda and on-call rotation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalendarScheduleRoute,
});

function CalendarScheduleRoute() {
  return <CalendarSchedule />;
}
