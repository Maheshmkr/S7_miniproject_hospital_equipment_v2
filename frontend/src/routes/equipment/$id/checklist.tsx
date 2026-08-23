import { createFileRoute } from "@tanstack/react-router";
import { ChecklistConfigPage } from "@/components/lifecycle/checklist-config";

export const Route = createFileRoute("/equipment/$id/checklist")({
  head: () => ({
    meta: [
      { title: "Maintenance Checklist Configuration — Medixa" },
      {
        name: "description",
        content:
          "Define the diagnostic checklist questions engineers must answer for this medical asset.",
      },
      { property: "og:title", content: "Maintenance Checklist Configuration — Medixa" },
      {
        property: "og:description",
        content:
          "Define the diagnostic checklist questions engineers must answer for this medical asset.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChecklistConfigRoute,
});

function ChecklistConfigRoute() {
  const { id } = Route.useParams();
  return <ChecklistConfigPage equipmentId={id} />;
}
