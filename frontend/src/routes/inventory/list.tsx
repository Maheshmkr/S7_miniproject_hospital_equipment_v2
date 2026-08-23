import { createFileRoute } from "@tanstack/react-router";
import { ModuleList } from "@/components/workflow/pages";
import { useInventoryList, useInventoryMutations } from "@/lib/api/useInventory";

const description =
  "Hospital inventory register: Search, filter, inspect stock balances, view reorder alerts, and export spare parts data.";

export const Route = createFileRoute("/inventory/list")({
  head: () => ({
    meta: [
      { title: "Inventory Register — Medixa" },
      { name: "description", content: description },
      { property: "og:title", content: "Inventory Register — Medixa" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InventoryListRoute,
});

function InventoryListRoute() {
  const live = useInventoryList({ limit: 200 });
  const { remove } = useInventoryMutations();

  const onDelete = async (record: { id: string; title: string }) => {
    if (!window.confirm(`Delete inventory item ${record.id} (${record.title})?`)) return;
    try {
      await remove(record.id);
      live.reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to delete this inventory item.");
    }
  };

  if (!live.enabled) return <ModuleList moduleKey="inventory" />;

  return (
    <ModuleList
      moduleKey="inventory"
      records={live.records ?? []}
      loading={live.loading}
      error={live.error}
      onDelete={(r) => void onDelete(r)}
    />
  );
}
