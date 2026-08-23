import { createFileRoute } from "@tanstack/react-router";
import { ModuleList } from "@/components/workflow/pages";
import { useEquipmentList, useEquipmentMutations } from "@/lib/api/useEquipment";

export const Route = createFileRoute("/equipment/list")({
  head: () => ({
    meta: [
      { title: "Equipment Register — Medixa" },
      {
        name: "description",
        content:
          "Browse and filter every asset record. Track, create and analyse every clinical asset in the hospital estate.",
      },
      { property: "og:title", content: "Equipment Register — Medixa" },
      {
        property: "og:description",
        content:
          "Browse and filter every asset record. Track, create and analyse every clinical asset in the hospital estate.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EquipmentListRoute,
});

function EquipmentListRoute() {
  const live = useEquipmentList({ limit: 200 });
  const { remove } = useEquipmentMutations();

  const onDelete = async (record: { id: string; title: string }) => {
    if (!window.confirm(`Delete ${record.title}? This cannot be undone.`)) return;
    try {
      await remove(record.id);
      live.reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to delete this asset.");
    }
  };

  if (!live.enabled) return <ModuleList moduleKey="equipment" />;

  return (
    <ModuleList
      moduleKey="equipment"
      records={live.records ?? []}
      loading={live.loading}
      error={live.error}
      onDelete={(r) => void onDelete(r)}
    />
  );
}
