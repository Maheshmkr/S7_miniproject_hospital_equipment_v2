import { createFileRoute } from "@tanstack/react-router";
import { ModuleAnalytics } from "@/components/workflow/pages";

export const Route = createFileRoute("/complaints/analytics")({
  head: () => ({
    meta: [
      { title: "Complaints Analytics — Medixa" },
      {
        name: "description",
        content: "Trends, distribution and comparative performance for complaints.",
      },
      { property: "og:title", content: "Complaints Analytics — Medixa" },
      {
        property: "og:description",
        content: "Trends, distribution and comparative performance for complaints.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComplaintsAnalyticsRoute,
});

function ComplaintsAnalyticsRoute() {
  return <ModuleAnalytics moduleKey="complaints" />;
}
