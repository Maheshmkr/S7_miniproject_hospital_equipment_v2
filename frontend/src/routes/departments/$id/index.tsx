import { createFileRoute } from "@tanstack/react-router";
import { ModuleDetails } from "@/components/workflow/pages";
import { useDepartmentRecord } from "@/lib/api/useDepartments";

export const Route = createFileRoute("/departments/$id/")({
  head: () => ({
    meta: [
      { title: "Department Details — Medixa" },
      {
        name: "description",
        content: "Full department profile, performance index and recent activity.",
      },
      { property: "og:title", content: "Department Details — Medixa" },
      {
        property: "og:description",
        content: "Full department profile, performance index and recent activity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DepartmentsDetailsRoute,
});

function DepartmentsDetailsRoute() {
  const { id } = Route.useParams();
  const live = useDepartmentRecord(id);

  if (!live.enabled) return <ModuleDetails moduleKey="departments" id={id} />;

  return (
    <ModuleDetails
      moduleKey="departments"
      id={id}
      record={live.record}
      loading={live.loading}
      error={live.error}
    />
  );
}
