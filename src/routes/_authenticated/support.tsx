import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Bot, Loader2, Inbox, ArrowLeft, UserCog } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { askSupport, userPostImage } from "@/lib/support.functions";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/db";
import { Avatar } from "@/components/Avatar";
import { SupportImage } from "@/components/SupportImage";
import { SupportPhotoButton } from "@/components/SupportPhotoButton";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({ meta: [{ title: "AI 客服 — 施工紀錄 PRO" }] }),
  component: SupportPage,
});

interface Msg {
  id: string;
  question: string | null;
  ai_answer: string | null;
  admin_reply: string | null;
  image_url: string | null;
  status: string;
  created_at: string;
  replied_at: string | null;
  ai_enabled: boolean;
}

type Bubble =
  | { kind: "user-text"; id: string; text: string; at: string }
  | { kind: "user-image"; id: string; path: string; at: string }
  | { kind: "ai"; id: string; text: string; at: string }
  | { kind: "admin-text"; id: string; text: string; at: string }
  | { kind: "admin-image"; id: string; path: string; at: string }
  | { kind: "system"; id: string; text: string; at: string };

const AI_NAME = "AI小幫手";
const ADMIN_NAME = "客服專員";

function buildBubbles(rows: Msg[]): Bubble[] {
  const out: Bubble[] = [];
  let lastAiEnabled: boolean | null = null;
  for (const r of rows) {
    // Skip internal transfer marker; we render system bubbles based on transitions instead.
    if (r.admin_reply === "__TRANSFER_NOTICE__") {
      if (lastAiEnabled !== false) {
        out.push({
          kind: "system",
          id: r.id + "-transfer",
          text: "🤖 AI小幫手已暫停，改由真人專員為您服務",
          at: r.created_at,
        });
        lastAiEnabled = false;
      }
      continue;
    }

    // Detect AI<->human transitions implicitly from row-level ai_enabled flag.
    if (lastAiEnabled !== null && lastAiEnabled !== r.ai_enabled) {
      out.push({
        kind: "system",
        id: r.id + "-sys",
        text: r.ai_enabled
          ? "🤖 系統提示：專員已離線，自動切換回 AI小幫手服務"
          : "👤 AI小幫手已暫停，改由真人專員為您服務",
        at: r.created_at,
      });
    }
    lastAiEnabled = r.ai_enabled;

    // User question text (skip system placeholders like "[圖片]" since the image bubble already renders)
    if (r.question && r.question !== "[圖片]") {
      out.push({ kind: "user-text", id: r.id + "-q", text: r.question, at: r.created_at });
    }
    if (r.image_url && !r.admin_reply) {
      out.push({ kind: "user-image", id: r.id + "-img", path: r.image_url, at: r.created_at });
    }
    if (r.ai_answer) {
      out.push({ kind: "ai", id: r.id + "-a", text: r.ai_answer, at: r.created_at });
    }
    if (r.admin_reply && r.admin_reply !== "[圖片]") {
      out.push({
        kind: "admin-text",
        id: r.id + "-r",
        text: r.admin_reply,
        at: r.replied_at ?? r.created_at,
      });
    }
    if (r.image_url && r.admin_reply) {
      out.push({
        kind: "admin-image",
        id: r.id + "-rimg",
        path: r.image_url,
        at: r.replied_at ?? r.created_at,
      });
    }
  }
  return out;
}

function SupportPage() {
  const qc = useQueryClient();
  const askFn = useServerFn(askSupport);
  const imgFn = useServerFn(userPostImage);
  const { data: profile } = useProfile();
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then((r) => setUserId(r.data.user?.id ?? null));
  }, []);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["support-messages"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      // Filter out truly empty rows (no question / answer / reply / image)
      return ((data ?? []) as Msg[]).filter(
        (m) => m.question || m.ai_answer || m.admin_reply || m.image_url,
      );
    },
    refetchInterval: 10000,
  });

  const bubbles = useMemo(() => buildBubbles(rows), [rows]);
  const aiOn = rows.length === 0 ? true : rows[rows.length - 1].ai_enabled !== false;

  const mut = useMutation({
    mutationFn: (question: string) => askFn({ data: { question } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support-messages"] });
      setInput("");
      setTimeout(() => taRef.current?.focus(), 0);
    },
    onError: (e: Error) => alert(e.message || "送出失敗"),
  });

  const imgMut = useMutation({
    mutationFn: (path: string) => imgFn({ data: { path } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["support-messages"] }),
    onError: (e: Error) => alert(e.message),
  });

  useEffect(() => { taRef.current?.focus(); }, []);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [bubbles.length, mut.isPending]);

  const StatusBadge = (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
        aiOn
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
          : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
      }`}
    >
      {aiOn ? <Bot className="h-3 w-3" /> : <UserCog className="h-3 w-3" />}
      {aiOn ? "AI小幫手在線中" : "專員真人接手中"}
    </span>
  );

  return (
    <AppShell>
      {/* Mobile fullscreen overlay */}
      <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
        <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-3">
          <Link to="/dashboard" className="grid h-10 w-10 place-items-center rounded-lg hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
              {aiOn ? <Bot className="h-4 w-4" /> : <UserCog className="h-4 w-4" />}
            </span>
            <div className="leading-tight">
              <div className="text-sm font-bold">{aiOn ? AI_NAME : ADMIN_NAME}</div>
              <div className="mt-0.5">{StatusBadge}</div>
            </div>
          </div>
        </div>
        <ChatBody
          scrollRef={scrollRef}
          isLoading={isLoading}
          bubbles={bubbles}
          pending={mut.isPending}
          userName={profile?.display_name}
          userAvatar={profile?.avatar_url}
        />
        <Composer
          taRef={taRef}
          input={input}
          setInput={setInput}
          onSend={(q) => mut.mutate(q)}
          pending={mut.isPending}
          userId={userId}
          onUploaded={(path) => imgMut.mutateAsync(path)}
          uploading={imgMut.isPending}
        />
      </div>

      {/* Desktop view */}
      <div className="hidden md:block">
        <div className="flex flex-wrap items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">AI 客服</h1>
          {StatusBadge}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          詢問 App 使用問題，AI 立即回覆。AI 無法回答的問題會自動轉交管理員。
        </p>

        <div className="card-surface mt-6 flex h-[65vh] min-h-[480px] flex-col overflow-hidden">
          <ChatBody
            scrollRef={scrollRef}
            isLoading={isLoading}
            bubbles={bubbles}
            pending={mut.isPending}
            userName={profile?.display_name}
            userAvatar={profile?.avatar_url}
          />
          <Composer
            taRef={taRef}
            input={input}
            setInput={setInput}
            onSend={(q) => mut.mutate(q)}
            pending={mut.isPending}
            userId={userId}
            onUploaded={(path) => imgMut.mutateAsync(path)}
            uploading={imgMut.isPending}
          />
        </div>
      </div>
    </AppShell>
  );
}

function ChatBody({
  scrollRef, isLoading, bubbles, pending, userName, userAvatar,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  isLoading: boolean;
  bubbles: Bubble[];
  pending: boolean;
  userName?: string | null;
  userAvatar?: string | null;
}) {
  return (
    <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
      {isLoading ? (
        <div className="grid h-full place-items-center text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : bubbles.length === 0 ? (
        <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
          <div>
            <Inbox className="mx-auto mb-2 h-8 w-8 opacity-60" />
            還沒有訊息。試著問問：<br />
            「怎麼新增案件？」「如何關掉照片浮水印？」
          </div>
        </div>
      ) : (
        bubbles.map((b) => (
          <BubbleRow key={b.id} b={b} userName={userName} userAvatar={userAvatar} />
        ))
      )}
      {pending && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {AI_NAME} 思考中…
        </div>
      )}
    </div>
  );
}

function BubbleRow({
  b, userName, userAvatar,
}: {
  b: Bubble;
  userName?: string | null;
  userAvatar?: string | null;
}) {
  if (b.kind === "system") {
    return (
      <div className="flex justify-center py-1">
        <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">
          — {b.text} —
        </span>
      </div>
    );
  }
  if (b.kind === "user-text" || b.kind === "user-image") {
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[85%] items-start gap-2">
          <div className="rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground shadow-sm">
            {b.kind === "user-text" ? (
              <div className="whitespace-pre-wrap break-words">{b.text}</div>
            ) : (
              <SupportImage path={b.path} />
            )}
            <div className="mt-1 text-[10px] opacity-70">
              {new Date(b.at).toLocaleString("zh-TW")}
            </div>
          </div>
          <Avatar name={userName ?? "您"} path={userAvatar} size={28} />
        </div>
      </div>
    );
  }
  if (b.kind === "ai") {
    return (
      <div className="flex justify-start">
        <div className="flex max-w-[85%] items-start gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
            <Bot className="h-3.5 w-3.5" />
          </span>
          <div className="space-y-1">
            <div className="text-[10px] font-semibold text-muted-foreground">{AI_NAME}</div>
            <div className="rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2 text-sm text-foreground shadow-sm">
              <div className="whitespace-pre-wrap break-words">{b.text}</div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                {new Date(b.at).toLocaleString("zh-TW")}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  // admin
  return (
    <div className="flex justify-start">
      <div className="flex max-w-[85%] items-start gap-2">
        <Avatar name={ADMIN_NAME} size={28} />
        <div className="space-y-1">
          <div className="text-[10px] font-semibold text-muted-foreground">{ADMIN_NAME}</div>
          <div className="rounded-2xl rounded-tl-sm border border-primary/30 bg-primary/5 px-3.5 py-2 text-sm shadow-sm">
            {b.kind === "admin-text" ? (
              <div className="whitespace-pre-wrap break-words">{b.text}</div>
            ) : (
              <SupportImage path={b.path} />
            )}
            <div className="mt-1 text-[10px] text-muted-foreground">
              {new Date(b.at).toLocaleString("zh-TW")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Composer({
  taRef, input, setInput, onSend, pending, userId, onUploaded, uploading,
}: {
  taRef: React.RefObject<HTMLTextAreaElement | null>;
  input: string;
  setInput: (v: string) => void;
  onSend: (q: string) => void;
  pending: boolean;
  userId: string | null;
  onUploaded: (path: string) => Promise<unknown>;
  uploading: boolean;
}) {
  return (
    <form
      className="flex items-end gap-2 border-t border-border bg-card p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const q = input.trim();
        if (!q || pending) return;
        onSend(q);
      }}
    >
      {userId && (
        <SupportPhotoButton customerUserId={userId} onUploaded={onUploaded} />
      )}
      <textarea
        ref={taRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            const q = input.trim();
            if (q && !pending) onSend(q);
          }
        }}
        placeholder="輸入問題…（Enter 送出，Shift+Enter 換行）"
        rows={2}
        maxLength={1000}
        className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <button
        type="submit"
        disabled={pending || uploading || !input.trim()}
        className="btn-touch inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-elevated)] hover:brightness-110 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        送出
      </button>
    </form>
  );
}
