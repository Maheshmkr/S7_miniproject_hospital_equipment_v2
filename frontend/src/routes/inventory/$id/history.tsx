import { createFileRoute } from "@tanstack/react-router";
import { ModuleHistory } from "@/components/workflow/pages";

const description =
  "Audit trail of inventory registration, stock receipts, issues, adjustments and transfers.";

export const Route = createFileRoute("/inventory/$id/history")({
  head: () => ({
    meta: [
      { title: "Inventory Movement History — Medixa" },
      { name: "description", content: description },
      { property: "og:title", content: "Inventory Movement History — Medixa" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InventoryHistoryRoute,
});

function InventoryHistoryRoute() {
  const { id } = Route.useParams();
  return <ModuleHistory moduleKey="inventory" id={id} />;
}
