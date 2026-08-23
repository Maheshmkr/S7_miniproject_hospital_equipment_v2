import { createFileRoute } from "@tanstack/react-router";
import { CorrectiveActionPage } from "@/components/lifecycle/maintenance";

export const Route = createFileRoute("/maintenance/$id/corrective-action")({
  head: () => ({
    meta: [
      { title: "Corrective Action — Medixa" },
      {
        name: "description",
        content: "Log parts replaced, tools used and the corrective work performed.",
      },
      { property: "og:title", content: "Corrective Action — Medixa" },
      {
        property: "og:description",
        content: "Log parts replaced, tools used and the corrective work performed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CorrectiveActionPageRoute,
});

function CorrectiveActionPageRoute() {
  const { id } = Route.useParams();
  return <CorrectiveActionPage id={id} />;
}
