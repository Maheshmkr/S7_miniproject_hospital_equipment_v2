import { createFileRoute } from "@tanstack/react-router";
import { TaskDetails } from "@/components/engineer/workspace";

export const Route = createFileRoute("/engineer/tasks/$id/")({
  head: () => ({
    meta: [
      { title: "Task Details — Medixa" },
      {
        name: "description",
        content: "Work order steps, parts, audit trail and the full field maintenance workflow.",
      },
      { property: "og:title", content: "Task Details — Medixa" },
      {
        property: "og:description",
        content: "Work order steps, parts, audit trail and the full field maintenance workflow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TaskDetailsRoute,
});

function TaskDetailsRoute() {
  const { id } = Route.useParams();
  return <TaskDetails id={id} />;
}
