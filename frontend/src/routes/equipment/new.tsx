import { createFileRoute } from "@tanstack/react-router";
import { ModuleCreate } from "@/components/workflow/pages";
import { apiEnabled } from "@/lib/api/client";
import { useEquipmentMutations } from "@/lib/api/useEquipment";

export const Route = createFileRoute("/equipment/new")({
  validateSearch: (search: Record<string, unknown>): { dept?: string; departmentId?: string } => ({
    ...(typeof search["dept"] === "string" ? { dept: search["dept"] } : {}),
    ...(typeof search["departmentId"] === "string" ? { departmentId: search["departmentId"] } : {}),
  }),
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
  const search = Route.useSearch();
  const initialDept = search.dept || search.departmentId;
  const defaultValues = initialDept ? { dept: initialDept, department: initialDept } : undefined;

  if (!apiEnabled) {
    return (
      <ModuleCreate
        moduleKey="equipment"
        {...(defaultValues ? { defaultValues } : {})}
      />
    );
  }

  return (
    <ModuleCreate
      moduleKey="equipment"
      {...(defaultValues ? { defaultValues } : {})}
      onSave={async (values) => {
        const payload: Record<string, string> = {
          ...values,
          ...(search.departmentId ? { departmentId: search.departmentId } : {}),
          ...(initialDept && !values["dept"] ? { dept: initialDept } : {}),
        };
        const saved = await create(payload);
        return { id: saved.equipmentId || saved._id };
      }}
    />
  );
}
