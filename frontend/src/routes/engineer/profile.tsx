import { createFileRoute } from "@tanstack/react-router";
import { EngineerProfilePage } from "@/components/engineer/insights";

export const Route = createFileRoute("/engineer/profile")({
  head: () => ({
    meta: [
      { title: "Engineer Profile — Medixa" },
      {
        name: "description",
        content: "Credentials, certifications, skills and assignment coverage.",
      },
      { property: "og:title", content: "Engineer Profile — Medixa" },
      {
        property: "og:description",
        content: "Credentials, certifications, skills and assignment coverage.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EngineerProfilePageRoute,
});

function EngineerProfilePageRoute() {
  return <EngineerProfilePage />;
}
