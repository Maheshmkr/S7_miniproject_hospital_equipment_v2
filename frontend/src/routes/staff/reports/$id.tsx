import { createFileRoute } from "@tanstack/react-router";
import { ServiceReportDetails } from "@/components/staff/account";

export const Route = createFileRoute("/staff/reports/$id")({
  head: () => ({
    meta: [
      { title: "Service Report — Medixa" },
      {
        name: "description",
        content: "Signed service report with findings, actions performed, parts used and sign-off.",
      },
      { property: "og:title", content: "Service Report — Medixa" },
      {
        property: "og:description",
        content: "Signed service report with findings, actions performed, parts used and sign-off.",
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <ServiceReportDetails id={id} />;
}
