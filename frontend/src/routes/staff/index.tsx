import { createFileRoute } from "@tanstack/react-router";
import { StaffDashboard } from "@/components/staff/workspace";

export const Route = createFileRoute("/staff/")({
  head: () => ({
    meta: [
      { title: "Department Staff Dashboard — Medixa" },
      {
        name: "description",
        content:
          "Monitor your department equipment health, complaints and maintenance progress in one workspace.",
      },
      { property: "og:title", content: "Department Staff Dashboard — Medixa" },
      {
        property: "og:description",
        content:
          "Monitor your department equipment health, complaints and maintenance progress in one workspace.",
      },
    ],
  }),
  component: StaffDashboard,
});
