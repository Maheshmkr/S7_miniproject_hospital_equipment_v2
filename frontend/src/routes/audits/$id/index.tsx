import { createFileRoute } from "@tanstack/react-router";
import { AuditDetails } from "@/components/lifecycle/audits";

export const Route = createFileRoute("/audits/$id/")({
  head: () => ({
    meta: [
      { title: "Audit Details — Medixa" },
      {
        name: "description",
        content: "Audit responses, metadata and the linked equipment audit trail.",
      },
      { property: "og:title", content: "Audit Details — Medixa" },
      {
        property: "og:description",
        content: "Audit responses, metadata and the linked equipment audit trail.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditDetailsRoute,
});

function AuditDetailsRoute() {
  const { id } = Route.useParams();
  return <AuditDetails id={id} />;
}
