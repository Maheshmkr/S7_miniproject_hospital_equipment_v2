import { createFileRoute } from "@tanstack/react-router";
import { ModuleHistory } from "@/components/workflow/pages";

export const Route = createFileRoute("/maintenance/$id/history")({
  head: () => ({
    meta: [
      { title: "Work order History — Medixa" },
      {
        name: "description",
        content: "Immutable audit trail of every change and review for this work order.",
      },
      { property: "og:title", content: "Work order History — Medixa" },
      {
        property: "og:description",
        content: "Immutable audit trail of every change and review for this work order.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MaintenanceHistoryRoute,
});

function MaintenanceHistoryRoute() {
  const { id } = Route.useParams();
  return <ModuleHistory moduleKey="maintenance" id={id} />;
}
