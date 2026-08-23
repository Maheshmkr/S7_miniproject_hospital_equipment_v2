import { createFileRoute } from "@tanstack/react-router";
import { AssignedTasks } from "@/components/engineer/workspace";

export const Route = createFileRoute("/engineer/tasks/")({
  head: () => ({
    meta: [
      { title: "Assigned Tasks — Medixa" },
      {
        name: "description",
        content:
          "Every maintenance work order routed to you with SLA burn, equipment and complaint context.",
      },
      { property: "og:title", content: "Assigned Tasks — Medixa" },
      {
        property: "og:description",
        content:
          "Every maintenance work order routed to you with SLA burn, equipment and complaint context.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssignedTasksRoute,
});

function AssignedTasksRoute() {
  return <AssignedTasks />;
}
