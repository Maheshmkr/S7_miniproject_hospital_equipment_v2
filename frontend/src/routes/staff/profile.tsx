import { createFileRoute } from "@tanstack/react-router";
import { StaffProfilePage } from "@/components/staff/account";

export const Route = createFileRoute("/staff/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Medixa" },
      {
        name: "description",
        content: "Manage your personal details, password and account security.",
      },
      { property: "og:title", content: "My Profile — Medixa" },
      {
        property: "og:description",
        content: "Manage your personal details, password and account security.",
      },
    ],
  }),
  component: StaffProfilePage,
});
