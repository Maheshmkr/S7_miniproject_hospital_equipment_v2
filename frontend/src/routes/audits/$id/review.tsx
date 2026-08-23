import { createFileRoute } from "@tanstack/react-router";
import { AuditReview } from "@/components/lifecycle/audits";

export const Route = createFileRoute("/audits/$id/review")({
  head: () => ({
    meta: [
      { title: "Review Audit — Medixa" },
      { name: "description", content: "Approve or reject a submitted audit response." },
      { property: "og:title", content: "Review Audit — Medixa" },
      { property: "og:description", content: "Approve or reject a submitted audit response." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditReviewRoute,
});

function AuditReviewRoute() {
  const { id } = Route.useParams();
  return <AuditReview id={id} />;
}
