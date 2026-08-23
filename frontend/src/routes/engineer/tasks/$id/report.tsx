import { createFileRoute } from "@tanstack/react-router";
import { ServiceReport } from "@/components/engineer/workflow";

export const Route = createFileRoute("/engineer/tasks/$id/report")({
  head: () => ({
    meta: [
      { title: "Service Report — Medixa" },
      {
        name: "description",
        content: "Formal service record with test results, recommendations and sign-off.",
      },
      { property: "og:title", content: "Service Report — Medixa" },
      {
        property: "og:description",
        content: "Formal service record with test results, recommendations and sign-off.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ServiceReportRoute,
});

function ServiceReportRoute() {
  const { id } = Route.useParams();
  return <ServiceReport id={id} />;
}
