import { createFileRoute } from "@tanstack/react-router";
import { ComplaintHistory } from "@/components/staff/complaints";

export const Route = createFileRoute("/staff/complaints/")({
  head: () => ({
    meta: [
      { title: "Complaint History — Medixa" },
      {
        name: "description",
        content:
          "Track every equipment complaint your department has raised, from triage to service report.",
      },
      { property: "og:title", content: "Complaint History — Medixa" },
      {
        property: "og:description",
        content:
          "Track every equipment complaint your department has raised, from triage to service report.",
      },
    ],
  }),
  component: ComplaintHistory,
});
