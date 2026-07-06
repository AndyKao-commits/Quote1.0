import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

/** 舊路徑相容：一律導向正式 App */
export const Route = createFileRoute("/local-demo")({
  component: () => <Outlet />,
  beforeLoad: ({ location }) => {
    const p = location.pathname;
    if (p === "/local-demo" || p === "/local-demo/") {
      throw redirect({ to: "/auth" });
    }
    if (p === "/local-demo/auth") throw redirect({ to: "/auth" });
    if (p === "/local-demo/settings") throw redirect({ to: "/settings" });
    if (p === "/local-demo/quotes" || p === "/local-demo/quotes/") throw redirect({ to: "/quotes" });
    const m = p.match(/^\/local-demo\/quotes\/([^/]+)$/);
    if (m) throw redirect({ to: "/quotes/$id", params: { id: m[1] } });
    throw redirect({ to: "/auth" });
  },
});
