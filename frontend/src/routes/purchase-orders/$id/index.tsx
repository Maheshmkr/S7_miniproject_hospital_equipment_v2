import { createFileRoute } from "@tanstack/react-router";
import { ModuleDetails } from "@/components/workflow/pages";
import { usePurchaseOrderRecord } from "@/lib/api/usePurchaseOrders";

const description =
  "Purchase order detail with line items, approval trail, totals and delivery status.";

export const Route = createFileRoute("/purchase-orders/$id/")({
  head: () => ({
    meta: [
      { title: "Purchase Order Details — Medixa" },
      { name: "description", content: description },
      { property: "og:title", content: "Purchase Order Details — Medixa" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PurchaseOrderDetailsRoute,
});

function PurchaseOrderDetailsRoute() {
  const { id } = Route.useParams();
  const live = usePurchaseOrderRecord(id);
  if (!live.enabled) return <ModuleDetails moduleKey="purchase-orders" id={id} />;
  return (
    <ModuleDetails
      moduleKey="purchase-orders"
      id={id}
      record={live.record}
      loading={live.loading}
      error={live.error}
    />
  );
}
