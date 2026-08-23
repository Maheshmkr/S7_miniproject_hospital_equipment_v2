import { createFileRoute } from "@tanstack/react-router";
import { ModuleHistory } from "@/components/workflow/pages";

export const Route = createFileRoute("/vendors/$id/history")({
  head: () => ({
    meta: [
      { title: "Vendor History — Medixa" },
      {
        name: "description",
        content: "Audit trail of vendor creation, updates, status changes and removals.",
      },
      { property: "og:title", content: "Vendor History — Medixa" },
      {
        property: "og:description",
        content: "Audit trail of vendor creation, updates, status changes and removals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VendorHistoryRoute,
});

function VendorHistoryRoute() {
  const { id } = Route.useParams();
  return <ModuleHistory moduleKey="vendors" id={id} />;
}
