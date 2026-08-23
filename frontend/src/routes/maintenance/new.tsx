import { createFileRoute } from "@tanstack/react-router";
import { ModuleCreate } from "@/components/workflow/pages";
import { apiEnabled } from "@/lib/api/client";
import { useWorkOrderMutations } from "@/lib/api/useWorkOrders";

export const Route = createFileRoute("/maintenance/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    complaintId:
      typeof search["complaintId"] === "string" ? (search["complaintId"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Create Work order — Medixa" },
      {
        name: "description",
        content: "Add a new work order to the maintenance register with full audit tracking.",
      },
      { property: "og:title", content: "Create Work order — Medixa" },
      {
        property: "og:description",
        content: "Add a new work order to the maintenance register with full audit tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MaintenanceCreateRoute,
});

function MaintenanceCreateRoute() {
  const { create } = useWorkOrderMutations();
  const search = Route.useSearch();
  if (!apiEnabled) return <ModuleCreate moduleKey="maintenance" />;
  return (
    <ModuleCreate
      moduleKey="maintenance"
      onSave={async (values) => {
        const saved = await create(
          values,
          search.complaintId ? { complaintId: search.complaintId } : undefined,
        );
        return { id: saved.workOrderId || saved._id };
      }}
    />
  );
}
