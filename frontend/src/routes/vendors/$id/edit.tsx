import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ModuleEdit } from "@/components/workflow/pages";
import { useVendorMutations, useVendorRecord } from "@/lib/api/useVendors";
import { toVendorPayload } from "@/lib/api/vendorRecords";

export const Route = createFileRoute("/vendors/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit Vendor — Medixa" },
      {
        name: "description",
        content: "Update vendor contacts, specialisation, category and lifecycle status.",
      },
      { property: "og:title", content: "Edit Vendor — Medixa" },
      {
        property: "og:description",
        content: "Update vendor contacts, specialisation, category and lifecycle status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VendorEditRoute,
});

function VendorEditRoute() {
  const { id } = Route.useParams();
  const live = useVendorRecord(id);
  const { update } = useVendorMutations();
  const navigate = useNavigate();

  if (!live.enabled) return <ModuleEdit moduleKey="vendors" id={id} />;

  return (
    <ModuleEdit
      moduleKey="vendors"
      id={id}
      record={live.record}
      loading={live.loading}
      error={live.error}
      onSave={async (values) => {
        const saved = await update(id, toVendorPayload(values));
        void navigate({ to: "/vendors/$id", params: { id: saved.vendorId || saved._id } });
        return { id: saved.vendorId || saved._id };
      }}
    />
  );
}
