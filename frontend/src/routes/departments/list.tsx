import { createFileRoute } from "@tanstack/react-router";
import { ModuleList } from "@/components/workflow/pages";
import { useDepartmentList, useDepartmentMutations } from "@/lib/api/useDepartments";

export const Route = createFileRoute("/departments/list")({
  head: () => ({
    meta: [
      { title: "Departments Register — Medixa" },
      {
        name: "description",
        content:
          "Browse and filter every department record. Compare department performance, staffing and equipment load.",
      },
      { property: "og:title", content: "Departments Register — Medixa" },
      {
        property: "og:description",
        content:
          "Browse and filter every department record. Compare department performance, staffing and equipment load.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DepartmentsListRoute,
});

function DepartmentsListRoute() {
  const live = useDepartmentList();
  const { remove } = useDepartmentMutations();

  const onDelete = async (record: { id: string; title: string }) => {
    if (
      !window.confirm(
        `Delete department ${record.title}? Departments with assigned equipment or users cannot be deleted.`,
      )
    )
      return;
    try {
      await remove(record.id);
      live.reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to delete this department.");
    }
  };

  if (!live.enabled) return <ModuleList moduleKey="departments" />;

  return (
    <ModuleList
      moduleKey="departments"
      records={live.records ?? []}
      loading={live.loading}
      error={live.error}
      onDelete={(r) => void onDelete(r)}
    />
  );
}
