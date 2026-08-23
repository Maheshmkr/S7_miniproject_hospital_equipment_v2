import { createFileRoute } from "@tanstack/react-router";
import { PerformanceDashboard } from "@/components/engineer/insights";

export const Route = createFileRoute("/engineer/performance")({
  head: () => ({
    meta: [
      { title: "Engineer Performance — Medixa" },
      {
        name: "description",
        content: "First-time fix rate, SLA adherence, utilisation and work mix analytics.",
      },
      { property: "og:title", content: "Engineer Performance — Medixa" },
      {
        property: "og:description",
        content: "First-time fix rate, SLA adherence, utilisation and work mix analytics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PerformanceDashboardRoute,
});

function PerformanceDashboardRoute() {
  return <PerformanceDashboard />;
}
