import { createFileRoute } from "@tanstack/react-router";
import { CompletePage } from "@/components/lifecycle/maintenance";

export const Route = createFileRoute("/maintenance/$id/complete")({
  head: () => ({
    meta: [
      { title: "Complete & Review — Medixa" },
      {
        name: "description",
        content: "Administrator review, approval and return of the asset to service.",
      },
      { property: "og:title", content: "Complete & Review — Medixa" },
      {
        property: "og:description",
        content: "Administrator review, approval and return of the asset to service.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompletePageRoute,
});

function CompletePageRoute() {
  const { id } = Route.useParams();
  return <CompletePage id={id} />;
}
