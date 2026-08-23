import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ModuleCreate } from "@/components/workflow/pages";
import { apiEnabled } from "@/lib/api/client";
import { useInventoryMutations } from "@/lib/api/useInventory";
import type { ApiInventoryInput } from "@/lib/api/types";

const description =
  "Register a new medical equipment spare part, consumable or maintenance supply into inventory.";

export const Route = createFileRoute("/inventory/new")({
  head: () => ({
    meta: [
      { title: "Add Inventory Item — Medixa" },
      { name: "description", content: description },
      { property: "og:title", content: "Add Inventory Item — Medixa" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InventoryCreateRoute,
});

function InventoryCreateRoute() {
  const { create } = useInventoryMutations();
  const navigate = useNavigate();

  if (!apiEnabled) return <ModuleCreate moduleKey="inventory" />;

  return (
    <ModuleCreate
      moduleKey="inventory"
      onSave={async (values) => {
        const payload: ApiInventoryInput = {
          name: values.name || "Untitled Item",
          sku: values.sku,
          category: values.category,
          itemType: values.itemType,
          description: values.description,
          manufacturer: values.manufacturer,
          vendorId: values.vendorId,
          unit: values.unit,
          quantity: values.quantity ? Number(values.quantity) : 0,
          minStockLevel: values.minStockLevel ? Number(values.minStockLevel) : 5,
          reorderLevel: values.reorderLevel ? Number(values.reorderLevel) : 10,
          maxStockLevel: values.maxStockLevel ? Number(values.maxStockLevel) : 100,
          unitCost: values.unitCost ? Number(values.unitCost) : 0,
          storageLocation: values.storageLocation,
          departmentId: values.departmentId,
          batchNumber: values.batchNumber,
          serialNumber: values.serialNumber,
          expiryDate: values.expiryDate,
        };
        const saved = await create(payload);
        const id = saved.itemId || saved._id;
        void navigate({ to: "/inventory/$id", params: { id } });
        return { id };
      }}
    />
  );
}
