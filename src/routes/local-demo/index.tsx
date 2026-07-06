import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/local-demo/")({
  beforeLoad: () => {
    throw redirect({ to: "/auth" });
  },
});
