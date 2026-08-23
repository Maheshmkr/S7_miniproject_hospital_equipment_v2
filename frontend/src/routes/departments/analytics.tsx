import { createFileRoute } from "@tanstack/react-router";
import { ModuleAnalytics } from "@/components/workflow/pages";

export const Route = createFileRoute("/departments/analytics")({
  head: () => ({
    meta: [
      { title: "Departments Analytics — Medixa" },
      {
        name: "description",
        content: "Trends, distribution and comparative performance for departments.",
      },
      { property: "og:title", content: "Departments Analytics — Medixa" },
      {
        property: "og:description",
        content: "Trends, distribution and comparative performance for departments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DepartmentsAnalyticsRoute,
});

function DepartmentsAnalyticsRoute() {
  return <ModuleAnalytics moduleKey="departments" />;
}
