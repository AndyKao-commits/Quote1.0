import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getAccessToken } from "@/lib/session";

export const Route = createFileRoute("/_app")({
  ssr: false,
  beforeLoad: () => {
    if (!getAccessToken()) throw redirect({ to: "/auth" });
  },
  component: () => <Outlet />,
});
