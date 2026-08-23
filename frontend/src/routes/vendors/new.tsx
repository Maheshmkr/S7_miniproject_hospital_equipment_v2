import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ModuleCreate } from "@/components/workflow/pages";
import { apiEnabled } from "@/lib/api/client";
import { useVendorMutations } from "@/lib/api/useVendors";
import { toVendorPayload } from "@/lib/api/vendorRecords";

export const Route = createFileRoute("/vendors/new")({
  head: () => ({
    meta: [
      { title: "Add Vendor — Medixa" },
      {
        name: "description",
        content: "Register a new manufacturer, supplier or service partner in the vendor register.",
      },
      { property: "og:title", content: "Add Vendor — Medixa" },
      {
        property: "og:description",
        content: "Register a new manufacturer, supplier or service partner in the vendor register.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VendorCreateRoute,
});

function VendorCreateRoute() {
  const { create } = useVendorMutations();
  const navigate = useNavigate();
  if (!apiEnabled) return <ModuleCreate moduleKey="vendors" />;
  return (
    <ModuleCreate
      moduleKey="vendors"
      onSave={async (values) => {
        const saved = await create(toVendorPayload(values));
        void navigate({ to: "/vendors/$id", params: { id: saved.vendorId || saved._id } });
        return { id: saved.vendorId || saved._id };
      }}
    />
  );
}
