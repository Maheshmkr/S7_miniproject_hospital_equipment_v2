import { createFileRoute } from "@tanstack/react-router";
import { CreateAuditTemplate } from "@/components/lifecycle/audits";

export const Route = createFileRoute("/audits/templates/new")({
  head: () => ({
    meta: [
      { title: "Create Audit Template — Medixa" },
      {
        name: "description",
        content: "Define the audit questions engineers must answer after maintenance.",
      },
      { property: "og:title", content: "Create Audit Template — Medixa" },
      {
        property: "og:description",
        content: "Define the audit questions engineers must answer after maintenance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreateAuditTemplateRoute,
});

function CreateAuditTemplateRoute() {
  return <CreateAuditTemplate />;
}
