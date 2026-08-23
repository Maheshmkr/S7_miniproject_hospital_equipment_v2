import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ModuleEdit } from "@/components/workflow/pages";
import { useDepartmentMutations, useDepartmentRecord } from "@/lib/api/useDepartments";
import { toDepartmentPayload } from "@/lib/api/departmentRecords";

export const Route = createFileRoute("/departments/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit Department — Medixa" },
      {
        name: "description",
        content: "Update department attributes, ownership and coverage with versioned changes.",
      },
      { property: "og:title", content: "Edit Department — Medixa" },
      {
        property: "og:description",
        content: "Update department attributes, ownership and coverage with versioned changes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DepartmentsEditRoute,
});

function DepartmentsEditRoute() {
  const { id } = Route.useParams();
  const live = useDepartmentRecord(id);
  const { update } = useDepartmentMutations();
  const navigate = useNavigate();

  if (!live.enabled) return <ModuleEdit moduleKey="departments" id={id} />;

  return (
    <ModuleEdit
      moduleKey="departments"
      id={id}
      record={live.record}
      loading={live.loading}
      error={live.error}
      onSave={async (values) => {
        const payload = toDepartmentPayload(values);
        const saved = await update(id, payload);
        void navigate({ to: "/departments/$id", params: { id: saved.code || saved._id } });
        return { id: saved.code || saved._id };
      }}
    />
  );
}
