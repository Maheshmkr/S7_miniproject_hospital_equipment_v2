import { createFileRoute } from "@tanstack/react-router";
import { EngineerEquipmentDetails } from "@/components/engineer/workspace";

export const Route = createFileRoute("/engineer/equipment/$id")({
  head: () => ({
    meta: [
      { title: "Equipment Details — Medixa" },
      {
        name: "description",
        content:
          "Field view of asset specification, condition, work orders and reported complaints.",
      },
      { property: "og:title", content: "Equipment Details — Medixa" },
      {
        property: "og:description",
        content:
          "Field view of asset specification, condition, work orders and reported complaints.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EngineerEquipmentDetailsRoute,
});

function EngineerEquipmentDetailsRoute() {
  const { id } = Route.useParams();
  return <EngineerEquipmentDetails id={id} />;
}
