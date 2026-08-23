import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ModuleEdit } from "@/components/workflow/pages";
import { useWarrantyMutations, useWarrantyRecord } from "@/lib/api/useWarranty";
import { toWarrantyPayload } from "@/lib/api/warrantyRecords";

export const Route = createFileRoute("/warranty/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit Contract — Medixa" },
      {
        name: "description",
        content: "Update contract attributes, ownership and coverage with versioned changes.",
      },
      { property: "og:title", content: "Edit Contract — Medixa" },
      {
        property: "og:description",
        content: "Update contract attributes, ownership and coverage with versioned changes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WarrantyEditRoute,
});

function WarrantyEditRoute() {
  const { id } = Route.useParams();
  const live = useWarrantyRecord(id);
  const { update } = useWarrantyMutations();
  const navigate = useNavigate();

  if (!live.enabled) return <ModuleEdit moduleKey="warranty" id={id} />;

  return (
    <ModuleEdit
      moduleKey="warranty"
      id={id}
      record={live.record}
      loading={live.loading}
      error={live.error}
      onSave={async (values) => {
        const payload = toWarrantyPayload(values);
        const saved = await update(id, payload);
        void navigate({ to: "/warranty/$id", params: { id: saved.warrantyId || saved._id } });
        return { id: saved.warrantyId || saved._id };
      }}
    />
  );
}
