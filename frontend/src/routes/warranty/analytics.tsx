import { createFileRoute } from "@tanstack/react-router";
import { ModuleAnalytics } from "@/components/workflow/pages";

export const Route = createFileRoute("/warranty/analytics")({
  head: () => ({
    meta: [
      { title: "Warranty & AMC Analytics — Medixa" },
      {
        name: "description",
        content: "Trends, distribution and comparative performance for warranty & amc.",
      },
      { property: "og:title", content: "Warranty & AMC Analytics — Medixa" },
      {
        property: "og:description",
        content: "Trends, distribution and comparative performance for warranty & amc.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WarrantyAnalyticsRoute,
});

function WarrantyAnalyticsRoute() {
  return <ModuleAnalytics moduleKey="warranty" />;
}
