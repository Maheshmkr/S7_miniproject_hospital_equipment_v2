import { createFileRoute } from "@tanstack/react-router";
import { MaintenanceStatusList } from "@/components/staff/complaints";

export const Route = createFileRoute("/staff/maintenance/")({
  head: () => ({
    meta: [
      { title: "Maintenance Status — Medixa" },
      {
        name: "description",
        content: "Follow live maintenance progress on your department's medical equipment.",
      },
      { property: "og:title", content: "Maintenance Status — Medixa" },
      {
        property: "og:description",
        content: "Follow live maintenance progress on your department's medical equipment.",
      },
    ],
  }),
  component: MaintenanceStatusList,
});
