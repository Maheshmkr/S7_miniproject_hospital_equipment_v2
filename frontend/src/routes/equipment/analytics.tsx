import { createFileRoute } from "@tanstack/react-router";
import { ModuleAnalytics } from "@/components/workflow/pages";

export const Route = createFileRoute("/equipment/analytics")({
  head: () => ({
    meta: [
      { title: "Equipment Analytics — Medixa" },
      {
        name: "description",
        content: "Trends, distribution and comparative performance for equipment.",
      },
      { property: "og:title", content: "Equipment Analytics — Medixa" },
      {
        property: "og:description",
        content: "Trends, distribution and comparative performance for equipment.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EquipmentAnalyticsRoute,
});

function EquipmentAnalyticsRoute() {
  return <ModuleAnalytics moduleKey="equipment" />;
}
