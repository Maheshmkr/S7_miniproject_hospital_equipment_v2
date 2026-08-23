import { createFileRoute } from "@tanstack/react-router";
import { AuditRespond } from "@/components/lifecycle/audits";

export const Route = createFileRoute("/audits/$id/respond")({
  head: () => ({
    meta: [
      { title: "Answer Audit — Medixa" },
      {
        name: "description",
        content: "Complete the administrator's audit questions with evidence.",
      },
      { property: "og:title", content: "Answer Audit — Medixa" },
      {
        property: "og:description",
        content: "Complete the administrator's audit questions with evidence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditRespondRoute,
});

function AuditRespondRoute() {
  const { id } = Route.useParams();
  return <AuditRespond id={id} />;
}
