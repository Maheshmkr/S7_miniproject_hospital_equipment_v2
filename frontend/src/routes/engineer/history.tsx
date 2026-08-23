import { createFileRoute } from "@tanstack/react-router";
import { MaintenanceHistoryPage } from "@/components/engineer/insights";

export const Route = createFileRoute("/engineer/history")({
  head: () => ({
    meta: [
      { title: "Maintenance History — Medixa" },
      {
        name: "description",
        content: "Every completed job with outcome, duration and downloadable service report.",
      },
      { property: "og:title", content: "Maintenance History — Medixa" },
      {
        property: "og:description",
        content: "Every completed job with outcome, duration and downloadable service report.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MaintenanceHistoryPageRoute,
});

function MaintenanceHistoryPageRoute() {
  return <MaintenanceHistoryPage />;
}
