import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { refreshSession } from "@/lib/auth.functions";
import { isLocalFirstMode } from "@/lib/local-first/config";
import { getStoredLicense } from "@/lib/local-first/license";
import { ensureValidSession } from "@/lib/session";

export const Route = createFileRoute("/_app")({
  ssr: false,
  beforeLoad: async () => {
    if (isLocalFirstMode()) {
      if (!getStoredLicense()) throw redirect({ to: "/auth" });
      return;
    }
    const ok = await ensureValidSession(async (refreshToken) =>
      refreshSession({ data: { refresh_token: refreshToken } }),
    );
    if (!ok) throw redirect({ to: "/auth" });
  },
  component: () => <Outlet />,
});
