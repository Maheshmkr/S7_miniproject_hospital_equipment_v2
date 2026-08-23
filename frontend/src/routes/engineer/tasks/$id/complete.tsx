import { createFileRoute } from "@tanstack/react-router";
import { CompleteMaintenance } from "@/components/engineer/workflow";

export const Route = createFileRoute("/engineer/tasks/$id/complete")({
  head: () => ({
    meta: [
      { title: "Complete Maintenance — Medixa" },
      {
        name: "description",
        content: "Close the work order, return the asset to service and schedule the next job.",
      },
      { property: "og:title", content: "Complete Maintenance — Medixa" },
      {
        property: "og:description",
        content: "Close the work order, return the asset to service and schedule the next job.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompleteMaintenanceRoute,
});

function CompleteMaintenanceRoute() {
  const { id } = Route.useParams();
  return <CompleteMaintenance id={id} />;
}
