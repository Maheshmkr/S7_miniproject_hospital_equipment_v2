import { createFileRoute } from "@tanstack/react-router";
import { AuditTemplates } from "@/components/lifecycle/audits";

export const Route = createFileRoute("/audits/templates/")({
  head: () => ({
    meta: [
      { title: "Audit Templates — Medixa" },
      {
        name: "description",
        content: "Administrator-owned audit question sets for post-maintenance governance.",
      },
      { property: "og:title", content: "Audit Templates — Medixa" },
      {
        property: "og:description",
        content: "Administrator-owned audit question sets for post-maintenance governance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditTemplatesRoute,
});

function AuditTemplatesRoute() {
  return <AuditTemplates />;
}
