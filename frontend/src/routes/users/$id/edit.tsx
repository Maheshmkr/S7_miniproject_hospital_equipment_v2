import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ModuleEdit } from "@/components/workflow/pages";
import { useUserMutations, useUserRecord } from "@/lib/api/useUsers";
import { toUserPayload } from "@/lib/api/userRecords";

export const Route = createFileRoute("/users/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit User — Medixa" },
      {
        name: "description",
        content: "Update user attributes, ownership and coverage with versioned changes.",
      },
      { property: "og:title", content: "Edit User — Medixa" },
      {
        property: "og:description",
        content: "Update user attributes, ownership and coverage with versioned changes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UsersEditRoute,
});

function UsersEditRoute() {
  const { id } = Route.useParams();
  const live = useUserRecord(id);
  const { update } = useUserMutations();
  const navigate = useNavigate();

  if (!live.enabled) return <ModuleEdit moduleKey="users" id={id} />;

  return (
    <ModuleEdit
      moduleKey="users"
      id={id}
      record={live.record}
      loading={live.loading}
      error={live.error}
      onSave={async (values) => {
        const payload = toUserPayload(values);
        const saved = await update(id, payload);
        void navigate({ to: "/users/$id", params: { id: saved._id } });
        return { id: saved._id };
      }}
    />
  );
}
