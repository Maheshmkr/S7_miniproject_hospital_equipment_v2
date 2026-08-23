import { createFileRoute } from "@tanstack/react-router";
import { ModuleAnalytics } from "@/components/workflow/pages";

export const Route = createFileRoute("/maintenance/analytics")({
  head: () => ({
    meta: [
      { title: "Maintenance Analytics — Medixa" },
      {
        name: "description",
        content: "Trends, distribution and comparative performance for maintenance.",
      },
      { property: "og:title", content: "Maintenance Analytics — Medixa" },
      {
        property: "og:description",
        content: "Trends, distribution and comparative performance for maintenance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MaintenanceAnalyticsRoute,
});

function MaintenanceAnalyticsRoute() {
  return <ModuleAnalytics moduleKey="maintenance" />;
}
