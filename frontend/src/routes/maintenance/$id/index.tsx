import { createFileRoute } from "@tanstack/react-router";
import { ModuleDetails } from "@/components/workflow/pages";
import { apiEnabled } from "@/lib/api/client";
import { useWorkOrderRecord } from "@/lib/api/useWorkOrders";

export const Route = createFileRoute("/maintenance/$id/")({
  head: () => ({
    meta: [
      { title: "Work order Details — Medixa" },
      {
        name: "description",
        content: "Full work order profile, performance index and recent activity.",
      },
      { property: "og:title", content: "Work order Details — Medixa" },
      {
        property: "og:description",
        content: "Full work order profile, performance index and recent activity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MaintenanceDetailsRoute,
});

function MaintenanceDetailsRoute() {
  const { id } = Route.useParams();
  const live = useWorkOrderRecord(id);
  if (!apiEnabled) return <ModuleDetails moduleKey="maintenance" id={id} />;
  return (
    <ModuleDetails
      moduleKey="maintenance"
      id={id}
      record={live.record}
      loading={live.loading}
      error={live.error}
    />
  );
}
