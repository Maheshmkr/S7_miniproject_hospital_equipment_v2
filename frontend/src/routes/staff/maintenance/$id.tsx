import { createFileRoute } from "@tanstack/react-router";
import { MaintenanceStatusDetails } from "@/components/staff/complaints";

export const Route = createFileRoute("/staff/maintenance/$id")({
  head: () => ({
    meta: [
      { title: "Maintenance Detail — Medixa" },
      {
        name: "description",
        content: "Work order stage, progress, parts replaced, remarks and maintenance images.",
      },
      { property: "og:title", content: "Maintenance Detail — Medixa" },
      {
        property: "og:description",
        content: "Work order stage, progress, parts replaced, remarks and maintenance images.",
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <MaintenanceStatusDetails id={id} />;
}
