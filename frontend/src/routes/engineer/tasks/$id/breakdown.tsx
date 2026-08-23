import { createFileRoute } from "@tanstack/react-router";
import { BreakdownMaintenance } from "@/components/engineer/workflow";

export const Route = createFileRoute("/engineer/tasks/$id/breakdown")({
  head: () => ({
    meta: [
      { title: "Breakdown Maintenance — Medixa" },
      {
        name: "description",
        content: "Capture fault mode, root cause, corrective actions and vendor escalation.",
      },
      { property: "og:title", content: "Breakdown Maintenance — Medixa" },
      {
        property: "og:description",
        content: "Capture fault mode, root cause, corrective actions and vendor escalation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BreakdownMaintenanceRoute,
});

function BreakdownMaintenanceRoute() {
  const { id } = Route.useParams();
  return <BreakdownMaintenance id={id} />;
}
