import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin.server";

export const signIn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ email: z.string().email(), password: z.string().min(6) }))
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    const { data: session, error } = await admin.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) throw new Error(error.message);
    if (!session.session) throw new Error("登入失敗");
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
    if (error) throw new Error(error.message);
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