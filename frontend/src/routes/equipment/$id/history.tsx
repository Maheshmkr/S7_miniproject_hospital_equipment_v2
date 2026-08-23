import { createFileRoute } from "@tanstack/react-router";
import { ModuleHistory } from "@/components/workflow/pages";

export const Route = createFileRoute("/equipment/$id/history")({
  head: () => ({
    meta: [
      { title: "Asset History — Medixa" },
      {
        name: "description",
        content: "Immutable audit trail of every change and review for this asset.",
      },
      { property: "og:title", content: "Asset History — Medixa" },
      {
        property: "og:description",
        content: "Immutable audit trail of every change and review for this asset.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EquipmentHistoryRoute,
});

function EquipmentHistoryRoute() {
  const { id } = Route.useParams();
  return <ModuleHistory moduleKey="equipment" id={id} />;
}
