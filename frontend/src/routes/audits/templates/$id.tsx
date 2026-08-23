import { createFileRoute } from "@tanstack/react-router";
import { AuditTemplateDetails } from "@/components/lifecycle/audits";

export const Route = createFileRoute("/audits/templates/$id")({
  head: () => ({
    meta: [
      { title: "Audit Template — Medixa" },
      { name: "description", content: "Review and edit the questions inside an audit template." },
      { property: "og:title", content: "Audit Template — Medixa" },
      {
        property: "og:description",
        content: "Review and edit the questions inside an audit template.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditTemplateDetailsRoute,
});

function AuditTemplateDetailsRoute() {
  const { id } = Route.useParams();
  return <AuditTemplateDetails id={id} />;
}
