import { createFileRoute } from "@tanstack/react-router";
import { ModuleHistory } from "@/components/workflow/pages";

export const Route = createFileRoute("/warranty/$id/history")({
  head: () => ({
    meta: [
      { title: "Contract History — Medixa" },
      {
        name: "description",
        content: "Immutable audit trail of every change and review for this contract.",
      },
      { property: "og:title", content: "Contract History — Medixa" },
      {
        property: "og:description",
        content: "Immutable audit trail of every change and review for this contract.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WarrantyHistoryRoute,
});

function WarrantyHistoryRoute() {
  const { id } = Route.useParams();
  return <ModuleHistory moduleKey="warranty" id={id} />;
}
