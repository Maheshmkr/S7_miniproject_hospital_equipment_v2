import { createFileRoute } from "@tanstack/react-router";
import { ModuleList } from "@/components/workflow/pages";
import { useComplaintList, useComplaintMutations } from "@/lib/api/useComplaints";

export const Route = createFileRoute("/complaints/list")({
  head: () => ({
    meta: [
      { title: "Complaints Register — Medixa" },
      {
        name: "description",
        content:
          "Browse and filter every ticket record. Raise, triage and resolve equipment complaints against SLA targets.",
      },
      { property: "og:title", content: "Complaints Register — Medixa" },
      {
        property: "og:description",
        content:
          "Browse and filter every ticket record. Raise, triage and resolve equipment complaints against SLA targets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComplaintsListRoute,
});

function ComplaintsListRoute() {
  const live = useComplaintList({ limit: 200 });
  const { remove } = useComplaintMutations();

  if (!live.enabled) return <ModuleList moduleKey="complaints" />;

  const onDelete = async (record: { id: string; title: string }) => {
    if (!window.confirm(`Delete ${record.id}? This cannot be undone.`)) return;
    try {
      await remove(record.id);
      live.reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to delete this complaint.");
    }
  };

  return (
    <ModuleList
      moduleKey="complaints"
      records={live.records ?? []}
      loading={live.loading}
      error={live.error}
      onDelete={(r) => void onDelete(r)}
    />
  );
}
