import { createFileRoute } from "@tanstack/react-router";
import { RootCausePage } from "@/components/lifecycle/maintenance";

export const Route = createFileRoute("/maintenance/$id/root-cause")({
  head: () => ({
    meta: [
      { title: "Root Cause Analysis — Medixa" },
      {
        name: "description",
        content: "Record findings, root cause category, corrective and preventive actions.",
      },
      { property: "og:title", content: "Root Cause Analysis — Medixa" },
      {
        property: "og:description",
        content: "Record findings, root cause category, corrective and preventive actions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RootCausePageRoute,
});

function RootCausePageRoute() {
  const { id } = Route.useParams();
  return <RootCausePage id={id} />;
}
