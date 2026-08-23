import { createFileRoute } from "@tanstack/react-router";
import { ChecklistPage } from "@/components/lifecycle/maintenance";

export const Route = createFileRoute("/maintenance/$id/checklist")({
  head: () => ({
    meta: [
      { title: "Maintenance Checklist — Medixa" },
      {
        name: "description",
        content: "Complete the technical maintenance checklist for the work order.",
      },
      { property: "og:title", content: "Maintenance Checklist — Medixa" },
      {
        property: "og:description",
        content: "Complete the technical maintenance checklist for the work order.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChecklistPageRoute,
});

function ChecklistPageRoute() {
  const { id } = Route.useParams();
  return <ChecklistPage id={id} />;
}
