import { createFileRoute } from "@tanstack/react-router";
import { StaffDepartmentProfile } from "@/components/staff/workspace";

export const Route = createFileRoute("/staff/department")({
  head: () => ({
    meta: [
      { title: "Department Profile — Medixa" },
      {
        name: "description",
        content: "Department contacts, equipment health analytics and maintenance summary.",
      },
      { property: "og:title", content: "Department Profile — Medixa" },
      {
        property: "og:description",
        content: "Department contacts, equipment health analytics and maintenance summary.",
      },
    ],
  }),
  component: StaffDepartmentProfile,
});
