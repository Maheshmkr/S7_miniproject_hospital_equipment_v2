import { createFileRoute } from "@tanstack/react-router";
import { ModuleList } from "@/components/workflow/pages";
import { useVendorList, useVendorMutations } from "@/lib/api/useVendors";

export const Route = createFileRoute("/vendors/list")({
  head: () => ({
    meta: [
      { title: "Vendor Register — Medixa" },
      {
        name: "description",
        content:
          "Browse manufacturers, suppliers and service partners with category, status and location filters.",
      },
      { property: "og:title", content: "Vendor Register — Medixa" },
      {
        property: "og:description",
        content:
          "Browse manufacturers, suppliers and service partners with category, status and location filters.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VendorListRoute,
});

function VendorListRoute() {
  const live = useVendorList({ limit: 200 });
  const { remove } = useVendorMutations();

  const onDelete = async (record: { id: string; title: string }) => {
    if (
      !window.confirm(
        `Delete vendor ${record.id}? Referenced vendors must be set to Inactive instead.`,
      )
    )
      return;
    try {
      await remove(record.id);
      live.reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to delete this vendor.");
    }
  };

  if (!live.enabled) return <ModuleList moduleKey="vendors" />;

  return (
    <ModuleList
      moduleKey="vendors"
      records={live.records ?? []}
      loading={live.loading}
      error={live.error}
      onDelete={(r) => void onDelete(r)}
    />
  );
}
