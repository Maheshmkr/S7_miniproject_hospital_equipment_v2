import { createFileRoute } from "@tanstack/react-router";
import { ModuleList } from "@/components/workflow/pages";
import { useInventoryList } from "@/lib/api/useInventory";

const description =
  "Hospital medical equipment inventory, spare parts stock levels, consumables tracking, and replenishment workflow.";

export const Route = createFileRoute("/inventory/")({
  head: () => ({
    meta: [
      { title: "Inventory Management — Medixa" },
      { name: "description", content: description },
      { property: "og:title", content: "Inventory Management — Medixa" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InventoryDashboardRoute,
});

function InventoryDashboardRoute() {
  const live = useInventoryList({ limit: 100 });
  if (!live.enabled) return <ModuleList moduleKey="inventory" />;
  return (
    <ModuleList
      moduleKey="inventory"
      records={live.records ?? []}
      loading={live.loading}
      error={live.error}
    />
  );
}
