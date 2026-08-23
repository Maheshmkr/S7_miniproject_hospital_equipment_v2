import { createFileRoute } from "@tanstack/react-router";
import { UploadsPage } from "@/components/lifecycle/maintenance";

export const Route = createFileRoute("/maintenance/$id/uploads")({
  head: () => ({
    meta: [
      { title: "Maintenance Evidence — Medixa" },
      {
        name: "description",
        content: "Attach before and after photos, printouts and vendor documents.",
      },
      { property: "og:title", content: "Maintenance Evidence — Medixa" },
      {
        property: "og:description",
        content: "Attach before and after photos, printouts and vendor documents.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UploadsPageRoute,
});

function UploadsPageRoute() {
  const { id } = Route.useParams();
  return <UploadsPage id={id} />;
}
