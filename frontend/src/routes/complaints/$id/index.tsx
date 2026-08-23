import { createFileRoute } from "@tanstack/react-router";
import { ModuleDetails } from "@/components/workflow/pages";
import { apiEnabled } from "@/lib/api/client";
import { useComplaintRecord } from "@/lib/api/useComplaints";

export const Route = createFileRoute("/complaints/$id/")({
  head: () => ({
    meta: [
      { title: "Ticket Details — Medixa" },
      {
        name: "description",
        content: "Full ticket profile, performance index and recent activity.",
      },
      { property: "og:title", content: "Ticket Details — Medixa" },
      {
        property: "og:description",
        content: "Full ticket profile, performance index and recent activity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComplaintsDetailsRoute,
});

function ComplaintsDetailsRoute() {
  const { id } = Route.useParams();
  const live = useComplaintRecord(id);
  if (!apiEnabled) return <ModuleDetails moduleKey="complaints" id={id} />;
  return (
    <ModuleDetails
      moduleKey="complaints"
      id={id}
      record={live.record}
      loading={live.loading}
      error={live.error}
    />
  );
}
