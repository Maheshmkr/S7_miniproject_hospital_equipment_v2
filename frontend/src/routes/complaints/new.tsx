import { createFileRoute } from "@tanstack/react-router";
import { ModuleCreate } from "@/components/workflow/pages";
import { apiEnabled } from "@/lib/api/client";
import { useComplaintMutations } from "@/lib/api/useComplaints";

export const Route = createFileRoute("/complaints/new")({
  head: () => ({
    meta: [
      { title: "Create Ticket — Medixa" },
      {
        name: "description",
        content: "Add a new ticket to the complaints register with full audit tracking.",
      },
      { property: "og:title", content: "Create Ticket — Medixa" },
      {
        property: "og:description",
        content: "Add a new ticket to the complaints register with full audit tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComplaintsCreateRoute,
});

function ComplaintsCreateRoute() {
  const { create } = useComplaintMutations();
  if (!apiEnabled) return <ModuleCreate moduleKey="complaints" />;
  return (
    <ModuleCreate
      moduleKey="complaints"
      onSave={async (values) => {
        const saved = await create(values);
        return { id: saved.complaintId || saved._id };
      }}
    />
  );
}
