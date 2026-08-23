import { createFileRoute } from "@tanstack/react-router";
import { ServiceReportPage } from "@/components/lifecycle/maintenance";

export const Route = createFileRoute("/maintenance/$id/report")({
  head: () => ({
    meta: [
      { title: "Service Report — Medixa" },
      {
        name: "description",
        content: "Generate and submit the service report for administrator approval.",
      },
      { property: "og:title", content: "Service Report — Medixa" },
      {
        property: "og:description",
        content: "Generate and submit the service report for administrator approval.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ServiceReportPageRoute,
});

function ServiceReportPageRoute() {
  const { id } = Route.useParams();
  return <ServiceReportPage id={id} />;
}
