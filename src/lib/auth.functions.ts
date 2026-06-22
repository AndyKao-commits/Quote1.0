import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin.server";
import {
  assertNotRateLimited,
  clearRateLimitBuckets,
  getClientIp,
  loginRateBuckets,
  recordRateLimitFailure,
} from "@/lib/rate-limit.server";

export const signIn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ email: z.string().email(), password: z.string().min(6) }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const buckets = loginRateBuckets(request, data.email);
    for (const bucket of buckets) await assertNotRateLimited(bucket);

    const admin = getSupabaseAdmin();
    const { data: session, error } = await admin.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) {
      for (const bucket of buckets) await recordRateLimitFailure(bucket);
      throw new Error(error.message);
    }
    if (!session.session) throw new Error("登入失敗");
    await clearRateLimitBuckets(buckets);
    return {
      access_token: session.session.access_token,
      refresh_token: session.session.refresh_token,
      user: { id: session.user!.id, email: session.user!.email },
    };
  });

export const signUp = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email(),
      password: z.string().min(6),
      display_name: z.string().optional(),
      company_name: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const ipBucket = `signup:ip:${getClientIp(request)}`;
    await assertNotRateLimited(ipBucket);

    const admin = getSupabaseAdmin();
    const { data: session, error } = await admin.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          display_name: data.display_name || data.email.split("@")[0],
          company_name: data.company_name || "",
        },
      },
    });
    if (error) {
      await recordRateLimitFailure(ipBucket);
      throw new Error(error.message);
    }
    await clearRateLimitBuckets([ipBucket]);
    if (session.session) {
      return {
        access_token: session.session.access_token,
        refresh_token: session.session.refresh_token,
        user: { id: session.user!.id, email: session.user!.email },
        needs_confirm: false,
      };
    }
    return { needs_confirm: true as const };
  });