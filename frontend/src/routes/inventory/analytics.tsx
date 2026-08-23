import { createFileRoute } from "@tanstack/react-router";
import { ModuleAnalytics } from "@/components/workflow/pages";
import { useInventoryList } from "@/lib/api/useInventory";

const description =
  "Inventory analytics: Stock turnover, category valuation, low-stock distribution, and replenishment trends.";

export const Route = createFileRoute("/inventory/analytics")({
  head: () => ({
    meta: [
      { title: "Inventory Analytics — Medixa" },
      { name: "description", content: description },
      { property: "og:title", content: "Inventory Analytics — Medixa" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InventoryAnalyticsRoute,
});

function InventoryAnalyticsRoute() {
  const live = useInventoryList({ limit: 200 });
  return <ModuleAnalytics moduleKey="inventory" records={live.records ?? []} />;
}
