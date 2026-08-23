import { createFileRoute } from "@tanstack/react-router";
import { ModuleList } from "@/components/workflow/pages";
import { useWorkOrderList, useWorkOrderMutations } from "@/lib/api/useWorkOrders";

export const Route = createFileRoute("/maintenance/list")({
  head: () => ({
    meta: [
      { title: "Maintenance Register — Medixa" },
      {
        name: "description",
        content:
          "Browse and filter every work order record. Plan preventive, corrective and calibration work across the estate.",
      },
      { property: "og:title", content: "Maintenance Register — Medixa" },
      {
        property: "og:description",
        content:
          "Browse and filter every work order record. Plan preventive, corrective and calibration work across the estate.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MaintenanceListRoute,
});

function MaintenanceListRoute() {
  const live = useWorkOrderList({ limit: 200 });
  const { remove } = useWorkOrderMutations();

  if (!live.enabled) return <ModuleList moduleKey="maintenance" />;

  const onDelete = async (record: { id: string }) => {
    if (!window.confirm(`Delete ${record.id}? This cannot be undone.`)) return;
    try {
      await remove(record.id);
      live.reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to delete this work order.");
    }
  };

  return (
    <ModuleList
      moduleKey="maintenance"
      records={live.records ?? []}
      loading={live.loading}
      error={live.error}
      onDelete={(r) => void onDelete(r)}
    />
  );
}
