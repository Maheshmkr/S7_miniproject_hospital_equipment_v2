import { createFileRoute } from "@tanstack/react-router";
import { ModuleEdit } from "@/components/workflow/pages";
import { apiEnabled } from "@/lib/api/client";
import { useEquipmentMutations, useEquipmentRecord } from "@/lib/api/useEquipment";

export const Route = createFileRoute("/equipment/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit Asset — Medixa" },
      {
        name: "description",
        content: "Update asset attributes, ownership and coverage with versioned changes.",
      },
      { property: "og:title", content: "Edit Asset — Medixa" },
      {
        property: "og:description",
        content: "Update asset attributes, ownership and coverage with versioned changes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EquipmentEditRoute,
});

function EquipmentEditRoute() {
  const { id } = Route.useParams();
  const live = useEquipmentRecord(id);
  const { update } = useEquipmentMutations();

  if (!apiEnabled) return <ModuleEdit moduleKey="equipment" id={id} />;

  return (
    <ModuleEdit
      moduleKey="equipment"
      id={id}
      record={live.record}
      loading={live.loading}
      error={live.error}
      onSave={async (values) => {
        const saved = await update(id, values);
        return { id: saved.equipmentId || saved._id };
      }}
    />
  );
}
