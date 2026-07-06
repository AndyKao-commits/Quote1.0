import "./lib/error-capture";

import { AUTH_PROXY_PATH } from "./lib/local-first/config";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

const LOCAL_MOCK_API =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_LOCAL_MOCK_API) ||
  "http://127.0.0.1:3099";

async function maybeProxyLocalAuth(request: Request): Promise<Response | null> {
  if (import.meta.env.PROD && import.meta.env.VITE_LOCAL_FIRST !== "true") return null;

  const url = new URL(request.url);
  if (!url.pathname.startsWith(AUTH_PROXY_PATH)) return null;

  const targetPath = url.pathname.slice(AUTH_PROXY_PATH.length) || "/";
  const target = `${LOCAL_MOCK_API.replace(/\/$/, "")}${targetPath}${url.search}`;
  const headers = new Headers(request.headers);
  headers.delete("host");

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body:
        request.method !== "GET" && request.method !== "HEAD"
          ? await request.arrayBuffer()
          : undefined,
    });
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: upstream.headers,
    });
  } catch (error) {
    console.error("[__local_auth__ proxy]", error);
    return Response.json(
      { error: "授權服務未啟動，請在電腦執行 npm run mock:api:lan" },
      { status: 502 },
    );
  }
}

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const proxied = await maybeProxyLocalAuth(request);
    if (proxied) return proxied;

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
