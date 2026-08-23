import { createFileRoute } from "@tanstack/react-router";
import { TestingPage } from "@/components/lifecycle/maintenance";

export const Route = createFileRoute("/maintenance/$id/testing")({
  head: () => ({
    meta: [
      { title: "Testing & Verification — Medixa" },
      {
        name: "description",
        content: "Electrical safety and performance verification before return to service.",
      },
      { property: "og:title", content: "Testing & Verification — Medixa" },
      {
        property: "og:description",
        content: "Electrical safety and performance verification before return to service.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TestingPageRoute,
});

function TestingPageRoute() {
  const { id } = Route.useParams();
  return <TestingPage id={id} />;
}
