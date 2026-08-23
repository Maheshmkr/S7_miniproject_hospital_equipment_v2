import { createFileRoute } from "@tanstack/react-router";
import { UploadEvidence } from "@/components/engineer/workflow";

export const Route = createFileRoute("/engineer/tasks/$id/uploads")({
  head: () => ({
    meta: [
      { title: "Upload Photos & Documents — Medixa" },
      {
        name: "description",
        content: "Attach before and after imagery, instrument printouts and vendor paperwork.",
      },
      { property: "og:title", content: "Upload Photos & Documents — Medixa" },
      {
        property: "og:description",
        content: "Attach before and after imagery, instrument printouts and vendor paperwork.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UploadEvidenceRoute,
});

function UploadEvidenceRoute() {
  const { id } = Route.useParams();
  return <UploadEvidence id={id} />;
}
