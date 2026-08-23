import { createFileRoute } from "@tanstack/react-router";
import { EngineerSettings } from "@/components/engineer/insights";

export const Route = createFileRoute("/engineer/settings")({
  head: () => ({
    meta: [
      { title: "Engineer Settings — Medixa" },
      {
        name: "description",
        content: "Notification routing, field defaults, offline sync and security preferences.",
      },
      { property: "og:title", content: "Engineer Settings — Medixa" },
      {
        property: "og:description",
        content: "Notification routing, field defaults, offline sync and security preferences.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EngineerSettingsRoute,
});

function EngineerSettingsRoute() {
  return <EngineerSettings />;
}
