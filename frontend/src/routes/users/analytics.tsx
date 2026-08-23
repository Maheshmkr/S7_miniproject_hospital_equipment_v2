import { createFileRoute } from "@tanstack/react-router";
import { ModuleAnalytics } from "@/components/workflow/pages";

export const Route = createFileRoute("/users/analytics")({
  head: () => ({
    meta: [
      { title: "User Management Analytics — Medixa" },
      {
        name: "description",
        content: "Trends, distribution and comparative performance for user management.",
      },
      { property: "og:title", content: "User Management Analytics — Medixa" },
      {
        property: "og:description",
        content: "Trends, distribution and comparative performance for user management.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UsersAnalyticsRoute,
});

function UsersAnalyticsRoute() {
  return <ModuleAnalytics moduleKey="users" />;
}
