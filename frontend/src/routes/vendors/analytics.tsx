import { createFileRoute } from "@tanstack/react-router";
import { ModuleAnalytics } from "@/components/workflow/pages";

export const Route = createFileRoute("/vendors/analytics")({
  head: () => ({
    meta: [
      { title: "Vendor Analytics — Medixa" },
      {
        name: "description",
        content: "Vendor mix by category, status distribution and partner coverage overview.",
      },
      { property: "og:title", content: "Vendor Analytics — Medixa" },
      {
        property: "og:description",
        content: "Vendor mix by category, status distribution and partner coverage overview.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <ModuleAnalytics moduleKey="vendors" />,
});
