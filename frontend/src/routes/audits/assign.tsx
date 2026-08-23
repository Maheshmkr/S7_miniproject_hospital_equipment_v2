import { createFileRoute } from "@tanstack/react-router";
import { AssignAudit } from "@/components/lifecycle/audits";

export const Route = createFileRoute("/audits/assign")({
  head: () => ({
    meta: [
      { title: "Assign Audit — Medixa" },
      {
        name: "description",
        content: "Send an audit template to a biomedical engineer for a specific asset.",
      },
      { property: "og:title", content: "Assign Audit — Medixa" },
      {
        property: "og:description",
        content: "Send an audit template to a biomedical engineer for a specific asset.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssignAuditRoute,
});

function AssignAuditRoute() {
  return <AssignAudit />;
}
