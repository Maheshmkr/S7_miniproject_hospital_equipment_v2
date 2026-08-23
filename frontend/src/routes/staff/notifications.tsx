import { createFileRoute } from "@tanstack/react-router";
import { StaffNotifications } from "@/components/staff/account";

export const Route = createFileRoute("/staff/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Medixa" },
      {
        name: "description",
        content:
          "Complaint updates, engineer assignments, maintenance milestones and hospital announcements.",
      },
      { property: "og:title", content: "Notifications — Medixa" },
      {
        property: "og:description",
        content:
          "Complaint updates, engineer assignments, maintenance milestones and hospital announcements.",
      },
    ],
  }),
  component: StaffNotifications,
});
