import { createFileRoute } from "@tanstack/react-router";
import { ModuleDetails } from "@/components/workflow/pages";
import { useVendorRecord } from "@/lib/api/useVendors";

export const Route = createFileRoute("/vendors/$id/")({
  head: () => ({
    meta: [
      { title: "Vendor Details — Medixa" },
      {
        name: "description",
        content:
          "Vendor profile with contacts, specialisation, linked contracts and covered assets.",
      },
      { property: "og:title", content: "Vendor Details — Medixa" },
      {
        property: "og:description",
        content:
          "Vendor profile with contacts, specialisation, linked contracts and covered assets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VendorDetailsRoute,
});

function VendorDetailsRoute() {
  const { id } = Route.useParams();
  const live = useVendorRecord(id);
  if (!live.enabled) return <ModuleDetails moduleKey="vendors" id={id} />;
  return (
    <ModuleDetails
      moduleKey="vendors"
      id={id}
      record={live.record}
      loading={live.loading}
      error={live.error}
    />
  );
}
