import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ModuleCreate } from "@/components/workflow/pages";
import { apiEnabled } from "@/lib/api/client";
import { useUserMutations } from "@/lib/api/useUsers";
import { toUserPayload } from "@/lib/api/userRecords";

export const Route = createFileRoute("/users/new")({
  head: () => ({
    meta: [
      { title: "Create User — Medixa" },
      {
        name: "description",
        content: "Add a new user to the user management register with full audit tracking.",
      },
      { property: "og:title", content: "Create User — Medixa" },
      {
        property: "og:description",
        content: "Add a new user to the user management register with full audit tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UsersCreateRoute,
});

function UsersCreateRoute() {
  const { create } = useUserMutations();
  const navigate = useNavigate();

  if (!apiEnabled) return <ModuleCreate moduleKey="users" />;

  return (
    <ModuleCreate
      moduleKey="users"
      onSave={async (values) => {
        const payload = toUserPayload(values);
        // Ensure default password if not provided in form
        if (!payload.password) {
          payload.password = "Medixa#2026";
        }
        const saved = await create(payload as Parameters<typeof create>[0]);
        void navigate({ to: "/users/$id", params: { id: saved._id } });
        return { id: saved._id };
      }}
    />
  );
}
