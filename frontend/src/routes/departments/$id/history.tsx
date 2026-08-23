import { createFileRoute } from "@tanstack/react-router";
import { ModuleHistory } from "@/components/workflow/pages";

export const Route = createFileRoute("/departments/$id/history")({
  head: () => ({
    meta: [
      { title: "Department History — Medixa" },
      {
        name: "description",
        content: "Immutable audit trail of every change and review for this department.",
      },
      { property: "og:title", content: "Department History — Medixa" },
      {
        property: "og:description",
        content: "Immutable audit trail of every change and review for this department.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DepartmentsHistoryRoute,
});

function DepartmentsHistoryRoute() {
  const { id } = Route.useParams();
  return <ModuleHistory moduleKey="departments" id={id} />;
}
