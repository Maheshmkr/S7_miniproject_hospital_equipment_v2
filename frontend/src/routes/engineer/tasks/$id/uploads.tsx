import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/engineer/tasks/$id/uploads")({
  component: UploadEvidenceRedirectRoute,
});

function UploadEvidenceRedirectRoute() {
  const { id } = Route.useParams();
  return <Navigate to="/engineer/tasks/$id/report" params={{ id }} replace />;
}
