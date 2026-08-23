import { createFileRoute } from "@tanstack/react-router";
import { StaffEquipmentWorkspace } from "@/components/staff/workspace";

export const Route = createFileRoute("/staff/equipment/")({
  head: () => ({
    meta: [
      { title: "Department Equipment — Medixa" },
      {
        name: "description",
        content:
          "Browse every medical device assigned to your department with health, warranty and status.",
      },
      { property: "og:title", content: "Department Equipment — Medixa" },
      {
        property: "og:description",
        content:
          "Browse every medical device assigned to your department with health, warranty and status.",
      },
    ],
  }),
  component: StaffEquipmentWorkspace,
});
