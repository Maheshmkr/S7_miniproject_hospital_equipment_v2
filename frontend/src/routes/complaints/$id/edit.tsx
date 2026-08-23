import { createFileRoute } from "@tanstack/react-router";
import { ModuleEdit } from "@/components/workflow/pages";
import { apiEnabled } from "@/lib/api/client";
import { useComplaintMutations, useComplaintRecord } from "@/lib/api/useComplaints";

export const Route = createFileRoute("/complaints/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit Ticket — Medixa" },
      {
        name: "description",
        content: "Update ticket attributes, ownership and coverage with versioned changes.",
      },
      { property: "og:title", content: "Edit Ticket — Medixa" },
      {
        property: "og:description",
        content: "Update ticket attributes, ownership and coverage with versioned changes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComplaintsEditRoute,
});

function ComplaintsEditRoute() {
  const { id } = Route.useParams();
  const live = useComplaintRecord(id);
  const { update } = useComplaintMutations();

  if (!apiEnabled) return <ModuleEdit moduleKey="complaints" id={id} />;

  return (
    <ModuleEdit
      moduleKey="complaints"
      id={id}
      record={live.record}
      loading={live.loading}
      error={live.error}
      onSave={async (values) => {
        const saved = await update(id, values);
        return { id: saved.complaintId || saved._id };
      }}
    />
  );
}
