import { createFileRoute } from "@tanstack/react-router";
import { EngineerDashboard } from "@/components/engineer/workspace";

export const Route = createFileRoute("/engineer/")({
  head: () => ({
    meta: [
      { title: "Biomedical Engineer Dashboard — Medixa" },
      {
        name: "description",
        content:
          "Live field assignments, shift readiness and workload trends for the biomedical engineering team.",
      },
      { property: "og:title", content: "Biomedical Engineer Dashboard — Medixa" },
      {
        property: "og:description",
        content:
          "Live field assignments, shift readiness and workload trends for the biomedical engineering team.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EngineerDashboardRoute,
});

function EngineerDashboardRoute() {
  return <EngineerDashboard />;
}
