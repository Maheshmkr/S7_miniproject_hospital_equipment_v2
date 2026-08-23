import { createFileRoute } from "@tanstack/react-router";
import { StaffSettings } from "@/components/staff/account";

export const Route = createFileRoute("/staff/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Medixa" },
      {
        name: "description",
        content: "Notification preferences, language, privacy and security controls.",
      },
      { property: "og:title", content: "Settings — Medixa" },
      {
        property: "og:description",
        content: "Notification preferences, language, privacy and security controls.",
      },
    ],
  }),
  component: StaffSettings,
});
