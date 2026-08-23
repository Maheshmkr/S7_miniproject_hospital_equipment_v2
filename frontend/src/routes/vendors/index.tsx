import { createFileRoute } from "@tanstack/react-router";
import { ModuleList } from "@/components/workflow/pages";
import { useVendorList } from "@/lib/api/useVendors";

export const Route = createFileRoute("/vendors/")({
  head: () => ({
    meta: [
      { title: "Vendor Management — Medixa" },
      {
        name: "description",
        content:
          "Manage the approved vendor register powering warranty, service and calibration partnerships.",
      },
      { property: "og:title", content: "Vendor Management — Medixa" },
      {
        property: "og:description",
        content:
          "Manage the approved vendor register powering warranty, service and calibration partnerships.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VendorWorkspaceRoute,
});

function VendorWorkspaceRoute() {
  const live = useVendorList({ limit: 200 });
  if (!live.enabled) return <ModuleList moduleKey="vendors" />;
  return (
    <ModuleList
      moduleKey="vendors"
      records={live.records ?? []}
      loading={live.loading}
      error={live.error}
    />
  );
}
