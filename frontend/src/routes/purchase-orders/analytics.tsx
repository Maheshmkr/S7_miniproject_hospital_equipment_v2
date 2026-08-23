import { createFileRoute } from "@tanstack/react-router";
import { ModuleAnalytics } from "@/components/workflow/pages";

const description =
  "Procurement analytics: order volume, approval throughput and status distribution.";

export const Route = createFileRoute("/purchase-orders/analytics")({
  head: () => ({
    meta: [
      { title: "Purchase Order Analytics — Medixa" },
      { name: "description", content: description },
      { property: "og:title", content: "Purchase Order Analytics — Medixa" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <ModuleAnalytics moduleKey="purchase-orders" />,
});
