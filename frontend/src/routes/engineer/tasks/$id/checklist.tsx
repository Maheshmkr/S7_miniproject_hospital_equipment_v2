import { createFileRoute } from "@tanstack/react-router";
import { PreventiveChecklistPage } from "@/components/engineer/workflow";

export const Route = createFileRoute("/engineer/tasks/$id/checklist")({
  head: () => ({
    meta: [
      { title: "Preventive Maintenance Checklist — Medixa" },
      {
        name: "description",
        content: "IEC 62353 aligned preventive checklist with electrical safety measurements.",
      },
      { property: "og:title", content: "Preventive Maintenance Checklist — Medixa" },
      {
        property: "og:description",
        content: "IEC 62353 aligned preventive checklist with electrical safety measurements.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PreventiveChecklistPageRoute,
});

function PreventiveChecklistPageRoute() {
  const { id } = Route.useParams();
  return <PreventiveChecklistPage id={id} />;
}
