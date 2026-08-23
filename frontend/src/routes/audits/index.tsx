import { createFileRoute } from "@tanstack/react-router";
import { AuditDashboard } from "@/components/lifecycle/audits";

export const Route = createFileRoute("/audits/")({
  head: () => ({
    meta: [
      { title: "Audit Management — Medixa" },
      {
        name: "description",
        content:
          "Create audit templates, assign audits to engineers and review completed evidence.",
      },
      { property: "og:title", content: "Audit Management — Medixa" },
      {
        property: "og:description",
        content:
          "Create audit templates, assign audits to engineers and review completed evidence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditDashboardRoute,
});

function AuditDashboardRoute() {
  return <AuditDashboard />;
}
