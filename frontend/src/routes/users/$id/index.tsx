import { createFileRoute } from "@tanstack/react-router";
import { ModuleDetails } from "@/components/workflow/pages";
import { useUserRecord } from "@/lib/api/useUsers";

export const Route = createFileRoute("/users/$id/")({
  head: () => ({
    meta: [
      { title: "User Details — Medixa" },
      { name: "description", content: "Full user profile, performance index and recent activity." },
      { property: "og:title", content: "User Details — Medixa" },
      {
        property: "og:description",
        content: "Full user profile, performance index and recent activity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UsersDetailsRoute,
});

function UsersDetailsRoute() {
  const { id } = Route.useParams();
  const live = useUserRecord(id);

  if (!live.enabled) return <ModuleDetails moduleKey="users" id={id} />;

  return (
    <ModuleDetails
      moduleKey="users"
      id={id}
      record={live.record}
      loading={live.loading}
      error={live.error}
    />
  );
}
