import { getSupabaseAdmin } from "@/lib/supabase-admin.server";

const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

type BucketState = { attempts: number; lockedUntil: number };

const memory = new Map<string, BucketState>();

function getMemory(bucket: string): BucketState {
  const now = Date.now();
  const row = memory.get(bucket);
  if (!row) return { attempts: 0, lockedUntil: 0 };
  if (row.lockedUntil && row.lockedUntil <= now) {
    memory.delete(bucket);
    return { attempts: 0, lockedUntil: 0 };
  }
  return row;
}

function setMemory(bucket: string, state: BucketState) {
  memory.set(bucket, state);
}

function lockMessage(lockedUntil: Date) {
  const mins = Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 60000));
  return `嘗試次數過多，請 ${mins} 分鐘後再試`;
}

async function readBucket(bucket: string): Promise<BucketState> {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("login_rate_limits")
      .select("attempts, locked_until")
      .eq("bucket", bucket)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { attempts: 0, lockedUntil: 0 };
    const lockedUntil = data.locked_until ? new Date(data.locked_until).getTime() : 0;
    if (lockedUntil && lockedUntil <= Date.now()) {
      await admin.from("login_rate_limits").delete().eq("bucket", bucket);
      return { attempts: 0, lockedUntil: 0 };
    }
    return { attempts: data.attempts ?? 0, lockedUntil };
  } catch {
    return getMemory(bucket);
  }
}

async function writeBucket(bucket: string, state: BucketState) {
  try {
    const admin = getSupabaseAdmin();
    if (!state.attempts && !state.lockedUntil) {
      await admin.from("login_rate_limits").delete().eq("bucket", bucket);
      memory.delete(bucket);
      return;
    }
    await admin.from("login_rate_limits").upsert({
      bucket,
      attempts: state.attempts,
      locked_until: state.lockedUntil ? new Date(state.lockedUntil).toISOString() : null,
      updated_at: new Date().toISOString(),
    });
  } catch {
    setMemory(bucket, state);
  }
}

/** 達上限則拋錯 */
export async function assertNotRateLimited(bucket: string) {
  const state = await readBucket(bucket);
  if (state.lockedUntil > Date.now()) {
    throw new Error(lockMessage(new Date(state.lockedUntil)));
  }
}

/** 記錄一次失敗；達上限則鎖定 */
export async function recordRateLimitFailure(bucket: string) {
  const state = await readBucket(bucket);
  if (state.lockedUntil > Date.now()) return;
  const attempts = state.attempts + 1;
  const lockedUntil = attempts >= MAX_ATTEMPTS ? Date.now() + LOCK_MS : 0;
  await writeBucket(bucket, { attempts: lockedUntil ? 0 : attempts, lockedUntil });
}

/** 成功後清除計數 */
export async function clearRateLimitBuckets(buckets: string[]) {
  await Promise.all(buckets.map((bucket) => writeBucket(bucket, { attempts: 0, lockedUntil: 0 })));
}

export function getClientIp(request: Request | undefined): string {
  if (!request) return "unknown";
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function loginRateBuckets(request: Request | undefined, email: string) {
  const ip = getClientIp(request);
  const normalized = email.trim().toLowerCase();
  return [`login:ip:${ip}`, `login:email:${normalized}`];
}

export function shareLookupBucket(request: Request | undefined) {
  return `share:ip:${getClientIp(request)}`;
}
