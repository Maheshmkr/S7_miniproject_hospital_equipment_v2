import { createFileRoute } from "@tanstack/react-router";
import { StartMaintenance } from "@/components/engineer/workflow";

export const Route = createFileRoute("/engineer/tasks/$id/start")({
  head: () => ({
    meta: [
      { title: "Start Maintenance — Medixa" },
      {
        name: "description",
        content:
          "Confirm safe isolation, job setup and site readiness before starting maintenance.",
      },
      { property: "og:title", content: "Start Maintenance — Medixa" },
      {
        property: "og:description",
        content:
          "Confirm safe isolation, job setup and site readiness before starting maintenance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StartMaintenanceRoute,
});

function StartMaintenanceRoute() {
  const { id } = Route.useParams();
  return <StartMaintenance id={id} />;
}
