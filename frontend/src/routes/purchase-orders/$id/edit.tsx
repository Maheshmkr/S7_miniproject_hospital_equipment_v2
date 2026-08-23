import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ModuleEdit } from "@/components/workflow/pages";
import { usePurchaseOrderMutations, usePurchaseOrderRecord } from "@/lib/api/usePurchaseOrders";
import { toPurchaseOrderPayload } from "@/lib/api/purchaseOrderRecords";

const description =
  "Update line items, delivery expectations and commercial terms before approval.";

export const Route = createFileRoute("/purchase-orders/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit Purchase Order — Medixa" },
      { name: "description", content: description },
      { property: "og:title", content: "Edit Purchase Order — Medixa" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PurchaseOrderEditRoute,
});

function PurchaseOrderEditRoute() {
  const { id } = Route.useParams();
  const live = usePurchaseOrderRecord(id);
  const { update } = usePurchaseOrderMutations();
  const navigate = useNavigate();

  if (!live.enabled) return <ModuleEdit moduleKey="purchase-orders" id={id} />;

  return (
    <ModuleEdit
      moduleKey="purchase-orders"
      id={id}
      record={live.record}
      loading={live.loading}
      error={live.error}
      onSave={async (values) => {
        const saved = await update(id, toPurchaseOrderPayload(values));
        const savedId = saved.purchaseOrderId || saved._id;
        void navigate({ to: "/purchase-orders/$id", params: { id: savedId } });
        return { id: savedId };
      }}
    />
  );
}
