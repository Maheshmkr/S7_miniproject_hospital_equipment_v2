import { createFileRoute } from "@tanstack/react-router";
import { ModuleHistory } from "@/components/workflow/pages";

const description = "Audit trail of creation, edits, approvals, rejections and delivery updates.";

export const Route = createFileRoute("/purchase-orders/$id/history")({
  head: () => ({
    meta: [
      { title: "Purchase Order History — Medixa" },
      { name: "description", content: description },
      { property: "og:title", content: "Purchase Order History — Medixa" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PurchaseOrderHistoryRoute,
});

function PurchaseOrderHistoryRoute() {
  const { id } = Route.useParams();
  return <ModuleHistory moduleKey="purchase-orders" id={id} />;
}
