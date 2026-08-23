import { createFileRoute } from "@tanstack/react-router";
import { AuditHistory } from "@/components/lifecycle/audits";

export const Route = createFileRoute("/audits/history")({
  head: () => ({
    meta: [
      { title: "Audit History — Medixa" },
      {
        name: "description",
        content: "Every audit raised, with its decision, reviewer and evidence.",
      },
      { property: "og:title", content: "Audit History — Medixa" },
      {
        property: "og:description",
        content: "Every audit raised, with its decision, reviewer and evidence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditHistoryRoute,
});

function AuditHistoryRoute() {
  return <AuditHistory />;
}
