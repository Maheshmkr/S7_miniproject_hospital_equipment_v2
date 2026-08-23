import { createFileRoute } from "@tanstack/react-router";
import { ModuleEdit } from "@/components/workflow/pages";
import { apiEnabled } from "@/lib/api/client";
import { useWorkOrderMutations, useWorkOrderRecord } from "@/lib/api/useWorkOrders";

export const Route = createFileRoute("/maintenance/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit Work order — Medixa" },
      {
        name: "description",
        content: "Update work order attributes, ownership and coverage with versioned changes.",
      },
      { property: "og:title", content: "Edit Work order — Medixa" },
      {
        property: "og:description",
        content: "Update work order attributes, ownership and coverage with versioned changes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MaintenanceEditRoute,
});

function MaintenanceEditRoute() {
  const { id } = Route.useParams();
  const live = useWorkOrderRecord(id);
  const { update } = useWorkOrderMutations();
  if (!apiEnabled) return <ModuleEdit moduleKey="maintenance" id={id} />;
  return (
    <ModuleEdit
      moduleKey="maintenance"
      id={id}
      record={live.record}
      loading={live.loading}
      error={live.error}
      onSave={async (values) => {
        const saved = await update(id, values);
        return { id: saved.workOrderId || saved._id };
      }}
    />
  );
}
