import { createFileRoute } from "@tanstack/react-router";
import { ModuleList } from "@/components/workflow/pages";
import { useWarrantyList, useWarrantyMutations } from "@/lib/api/useWarranty";

export const Route = createFileRoute("/warranty/list")({
  head: () => ({
    meta: [
      { title: "Warranty & AMC Register — Medixa" },
      {
        name: "description",
        content:
          "Browse and filter every contract record. Track vendor contracts, coverage levels and upcoming renewals.",
      },
      { property: "og:title", content: "Warranty & AMC Register — Medixa" },
      {
        property: "og:description",
        content:
          "Browse and filter every contract record. Track vendor contracts, coverage levels and upcoming renewals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WarrantyListRoute,
});

function WarrantyListRoute() {
  const live = useWarrantyList({ limit: 200 });
  const { remove } = useWarrantyMutations();

  const onDelete = async (record: { id: string; title: string }) => {
    if (!window.confirm(`Delete contract ${record.id}? This cannot be undone.`)) return;
    try {
      await remove(record.id);
      live.reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to delete this contract.");
    }
  };

  if (!live.enabled) return <ModuleList moduleKey="warranty" />;

  return (
    <ModuleList
      moduleKey="warranty"
      records={live.records ?? []}
      loading={live.loading}
      error={live.error}
      onDelete={(r) => void onDelete(r)}
    />
  );
}
