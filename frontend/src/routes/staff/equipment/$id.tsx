import { createFileRoute } from "@tanstack/react-router";
import { StaffEquipmentDetails } from "@/components/staff/workspace";

export const Route = createFileRoute("/staff/equipment/$id")({
  head: () => ({
    meta: [
      { title: "Equipment Details — Medixa" },
      {
        name: "description",
        content:
          "Full asset record with specifications, complaint history, service history and documents.",
      },
      { property: "og:title", content: "Equipment Details — Medixa" },
      {
        property: "og:description",
        content:
          "Full asset record with specifications, complaint history, service history and documents.",
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <StaffEquipmentDetails id={id} />;
}
