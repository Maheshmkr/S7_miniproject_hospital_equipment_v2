import { createFileRoute } from "@tanstack/react-router";
import { ComplaintDetails } from "@/components/staff/complaints";

export const Route = createFileRoute("/staff/complaints/$id")({
  head: () => ({
    meta: [
      { title: "Complaint Details — Medixa" },
      {
        name: "description",
        content: "Complaint timeline, engineer notes, maintenance progress and service report.",
      },
      { property: "og:title", content: "Complaint Details — Medixa" },
      {
        property: "og:description",
        content: "Complaint timeline, engineer notes, maintenance progress and service report.",
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <ComplaintDetails id={id} />;
}
