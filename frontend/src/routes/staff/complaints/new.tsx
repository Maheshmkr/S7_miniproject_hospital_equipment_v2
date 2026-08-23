import { createFileRoute } from "@tanstack/react-router";
import { RegisterComplaint } from "@/components/staff/complaints";

export const Route = createFileRoute("/staff/complaints/new")({
  head: () => ({
    meta: [
      { title: "Register Complaint — Medixa" },
      {
        name: "description",
        content:
          "Report an equipment issue in four guided steps with photos, symptoms and preferred visit.",
      },
      { property: "og:title", content: "Register Complaint — Medixa" },
      {
        property: "og:description",
        content:
          "Report an equipment issue in four guided steps with photos, symptoms and preferred visit.",
      },
    ],
  }),
  component: RegisterComplaint,
});
