import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { refreshSession } from "@/lib/auth.functions";
import { ensureValidSession } from "@/lib/session";

export const Route = createFileRoute("/_app")({
  ssr: false,
  beforeLoad: async () => {
    const ok = await ensureValidSession(async (refreshToken) =>
      refreshSession({ data: { refresh_token: refreshToken } }),
    );
    if (!ok) throw redirect({ to: "/auth" });
  },
  component: () => <Outlet />,
});
