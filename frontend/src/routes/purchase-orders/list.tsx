import { createFileRoute } from "@tanstack/react-router";
import { ModuleList } from "@/components/workflow/pages";
import { usePurchaseOrderList, usePurchaseOrderMutations } from "@/lib/api/usePurchaseOrders";

const description =
  "Browse every purchase order with vendor, department, status and committed value at a glance.";

export const Route = createFileRoute("/purchase-orders/list")({
  head: () => ({
    meta: [
      { title: "Purchase Order Register — Medixa" },
      { name: "description", content: description },
      { property: "og:title", content: "Purchase Order Register — Medixa" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PurchaseOrderListRoute,
});

function PurchaseOrderListRoute() {
  const live = usePurchaseOrderList({ limit: 200 });
  const { remove } = usePurchaseOrderMutations();

  const onDelete = async (record: { id: string; title: string }) => {
    if (!window.confirm(`Delete ${record.id}? Only draft or rejected orders can be removed.`))
      return;
    try {
      await remove(record.id);
      live.reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to delete this purchase order.");
    }
  };

  if (!live.enabled) return <ModuleList moduleKey="purchase-orders" />;

  return (
    <ModuleList
      moduleKey="purchase-orders"
      records={live.records ?? []}
      loading={live.loading}
      error={live.error}
      onDelete={(r) => void onDelete(r)}
    />
  );
}
