import { createFileRoute } from "@tanstack/react-router";
import { InvestigationPage } from "@/components/lifecycle/maintenance";

export const Route = createFileRoute("/maintenance/$id/investigation")({
  head: () => ({
    meta: [
      { title: "Investigation — Medixa" },
      {
        name: "description",
        content: "Safety check, initial findings and investigation start for the work order.",
      },
      { property: "og:title", content: "Investigation — Medixa" },
      {
        property: "og:description",
        content: "Safety check, initial findings and investigation start for the work order.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvestigationPageRoute,
});

function InvestigationPageRoute() {
  const { id } = Route.useParams();
  return <InvestigationPage id={id} />;
}
