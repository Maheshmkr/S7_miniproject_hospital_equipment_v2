import { createFileRoute } from "@tanstack/react-router";
import { ModuleCreate } from "@/components/workflow/pages";
import { apiEnabled } from "@/lib/api/client";
import { useEquipmentMutations } from "@/lib/api/useEquipment";

export const Route = createFileRoute("/equipment/new")({
  head: () => ({
    meta: [
      { title: "Create Asset — Medixa" },
      {
        name: "description",
        content: "Add a new asset to the equipment register with full audit tracking.",
      },
      { property: "og:title", content: "Create Asset — Medixa" },
      {
        property: "og:description",
        content: "Add a new asset to the equipment register with full audit tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EquipmentCreateRoute,
});

function EquipmentCreateRoute() {
  const { create } = useEquipmentMutations();
  if (!apiEnabled) return <ModuleCreate moduleKey="equipment" />;
  return (
    <ModuleCreate
      moduleKey="equipment"
      onSave={async (values) => {
        const saved = await create(values);
        return { id: saved.equipmentId || saved._id };
      }}
    />
  );
}
