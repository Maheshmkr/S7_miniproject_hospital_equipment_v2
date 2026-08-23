import { createFileRoute } from "@tanstack/react-router";
import { ModuleHistory } from "@/components/workflow/pages";

export const Route = createFileRoute("/users/$id/history")({
  head: () => ({
    meta: [
      { title: "User History — Medixa" },
      {
        name: "description",
        content: "Immutable audit trail of every change and review for this user.",
      },
      { property: "og:title", content: "User History — Medixa" },
      {
        property: "og:description",
        content: "Immutable audit trail of every change and review for this user.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UsersHistoryRoute,
});

function UsersHistoryRoute() {
  const { id } = Route.useParams();
  return <ModuleHistory moduleKey="users" id={id} />;
}
