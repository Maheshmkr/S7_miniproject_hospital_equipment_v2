import { createFileRoute } from "@tanstack/react-router";
import { ModuleCreate } from "@/components/workflow/pages";
import { apiEnabled } from "@/lib/api/client";
import { useWarrantyMutations } from "@/lib/api/useWarranty";
import { toWarrantyPayload } from "@/lib/api/warrantyRecords";

export const Route = createFileRoute("/warranty/new")({
  head: () => ({
    meta: [
      { title: "Create Contract — Medixa" },
      {
        name: "description",
        content: "Add a new contract to the warranty & amc register with full audit tracking.",
      },
      { property: "og:title", content: "Create Contract — Medixa" },
      {
        property: "og:description",
        content: "Add a new contract to the warranty & amc register with full audit tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WarrantyCreateRoute,
});

function WarrantyCreateRoute() {
  const { create } = useWarrantyMutations();
  if (!apiEnabled) return <ModuleCreate moduleKey="warranty" />;
  return (
    <ModuleCreate
      moduleKey="warranty"
      onSave={async (values) => {
        const payload = toWarrantyPayload(values, values["equipment"]);
        const saved = await create(payload as Parameters<typeof create>[0]);
        return { id: saved.warrantyId || saved._id };
      }}
    />
  );
}
