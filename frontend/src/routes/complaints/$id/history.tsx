import { createFileRoute } from "@tanstack/react-router";
import { ModuleHistory } from "@/components/workflow/pages";

export const Route = createFileRoute("/complaints/$id/history")({
  head: () => ({
    meta: [
      { title: "Ticket History — Medixa" },
      {
        name: "description",
        content: "Immutable audit trail of every change and review for this ticket.",
      },
      { property: "og:title", content: "Ticket History — Medixa" },
      {
        property: "og:description",
        content: "Immutable audit trail of every change and review for this ticket.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComplaintsHistoryRoute,
});

function ComplaintsHistoryRoute() {
  const { id } = Route.useParams();
  return <ModuleHistory moduleKey="complaints" id={id} />;
}
