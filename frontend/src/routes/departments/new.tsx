import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ModuleCreate } from "@/components/workflow/pages";
import { apiEnabled } from "@/lib/api/client";
import { useDepartmentMutations } from "@/lib/api/useDepartments";
import { toDepartmentPayload } from "@/lib/api/departmentRecords";

export const Route = createFileRoute("/departments/new")({
  head: () => ({
    meta: [
      { title: "Create Department — Medixa" },
      {
        name: "description",
        content: "Add a new department to the departments register with full audit tracking.",
      },
      { property: "og:title", content: "Create Department — Medixa" },
      {
        property: "og:description",
        content: "Add a new department to the departments register with full audit tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DepartmentsCreateRoute,
});

function DepartmentsCreateRoute() {
  const { create } = useDepartmentMutations();
  const navigate = useNavigate();

  if (!apiEnabled) return <ModuleCreate moduleKey="departments" />;

  return (
    <ModuleCreate
      moduleKey="departments"
      onSave={async (values) => {
        const payload = toDepartmentPayload(values);
        const saved = await create(payload);
        void navigate({ to: "/departments/$id", params: { id: saved.code || saved._id } });
        return { id: saved.code || saved._id };
      }}
    />
  );
}
