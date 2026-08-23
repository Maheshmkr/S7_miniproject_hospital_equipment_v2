import { createFileRoute } from "@tanstack/react-router";
import { ServiceReportsList } from "@/components/staff/account";

export const Route = createFileRoute("/staff/reports/")({
  head: () => ({
    meta: [
      { title: "Service Reports — Medixa" },
      {
        name: "description",
        content:
          "Download signed service reports for completed maintenance on department equipment.",
      },
      { property: "og:title", content: "Service Reports — Medixa" },
      {
        property: "og:description",
        content:
          "Download signed service reports for completed maintenance on department equipment.",
      },
    ],
  }),
  component: ServiceReportsList,
});
