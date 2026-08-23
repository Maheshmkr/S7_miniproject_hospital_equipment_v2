import { createFileRoute } from "@tanstack/react-router";
import { ModuleList } from "@/components/workflow/pages";
import { usePurchaseOrderList } from "@/lib/api/usePurchaseOrders";

const description =
  "Track procurement from draft request through approval, ordering and delivery against the approved vendor register.";

export const Route = createFileRoute("/purchase-orders/")({
  head: () => ({
    meta: [
      { title: "Purchase Order Management — Medixa" },
      { name: "description", content: description },
      { property: "og:title", content: "Purchase Order Management — Medixa" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PurchaseOrderWorkspaceRoute,
});

function PurchaseOrderWorkspaceRoute() {
  const live = usePurchaseOrderList({ limit: 200 });
  if (!live.enabled) return <ModuleList moduleKey="purchase-orders" />;
  return (
    <ModuleList
      moduleKey="purchase-orders"
      records={live.records ?? []}
      loading={live.loading}
      error={live.error}
    />
  );
}
