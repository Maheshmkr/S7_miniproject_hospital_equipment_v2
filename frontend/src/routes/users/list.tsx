import { createFileRoute } from "@tanstack/react-router";
import { ModuleList } from "@/components/workflow/pages";
import { useUserList, useUserMutations } from "@/lib/api/useUsers";

export const Route = createFileRoute("/users/list")({
  head: () => ({
    meta: [
      { title: "User Management Register — Medixa" },
      {
        name: "description",
        content:
          "Browse and filter every user record. Manage workspace members, roles and access permissions.",
      },
      { property: "og:title", content: "User Management Register — Medixa" },
      {
        property: "og:description",
        content:
          "Browse and filter every user record. Manage workspace members, roles and access permissions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UsersListRoute,
});

function UsersListRoute() {
  const live = useUserList({ limit: 200 });
  const { remove } = useUserMutations();

  const onDelete = async (record: { id: string; title: string }) => {
    if (
      !window.confirm(
        `Remove user ${record.title}? Users referenced in operational records will be deactivated instead.`,
      )
    )
      return;
    try {
      await remove(record.id);
      live.reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to remove this user.");
    }
  };

  if (!live.enabled) return <ModuleList moduleKey="users" />;

  return (
    <ModuleList
      moduleKey="users"
      records={live.records ?? []}
      loading={live.loading}
      error={live.error}
      onDelete={(r) => void onDelete(r)}
    />
  );
}
