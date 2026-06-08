import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, Loader2, Send, ArrowLeft, Tag, Bot, UserCog, ChevronDown, MessageSquare, CircleUserRound, Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { useIsAdmin } from "@/lib/useIsAdmin";
import {
  adminListInboxRooms,
  adminGetRoomMessages,
  adminPostReply,
  adminPostImage,
  adminTakeoverRoom,
  adminMarkRoomRead,
  type InboxRoom,
} from "@/lib/inbox.functions";
import { useCannedResponses } from "@/lib/canned";
import { SupportImage } from "@/components/SupportImage";
import { SupportPhotoButton } from "@/components/SupportPhotoButton";

const DEFAULT_CANNED = [
  { id: "_d1", title: "您好，這邊是客服", content: "您好，我是客服專員，已收到您的訊息，將盡快為您處理。" },
  { id: "_d2", title: "確認問題細節", content: "為了協助您處理，可否再提供問題發生的時間、地點與相關照片？" },
  { id: "_d3", title: "派工確認", content: "已為您安排師傅前往，預計到場時間會再 LINE 通知您，請保持手機暢通。" },
  { id: "_d4", title: "施工進度更新", content: "目前施工進度約 60%，預計 ___ 完工，照片我會稍後上傳到案件中。" },
  { id: "_d5", title: "報價說明", content: "本案件含工資、材料合計約 NT$ ___，明細已附在案件材料清單中。" },
  { id: "_d6", title: "完工驗收", content: "本案件已完工，麻煩您協助驗收並回覆是否一切正常，感謝！" },
  { id: "_d7", title: "感謝詢問", content: "感謝您的詢問，若還有任何問題隨時與我們聯繫。" },
  { id: "_d8", title: "稍後回覆", content: "目前在現場處理中，稍後會盡快回覆您，感謝耐心等候。" },
];


export const Route = createFileRoute("/_authenticated/admin/inbox")({
  head: () => ({ meta: [{ title: "客服收件夾 — 施工紀錄 PRO" }] }),
  component: InboxPage,
});

const TAG_COLORS = [
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-pink-500/15 text-pink-700 dark:text-pink-300",
];
function tagColor(t: string) {
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
  return TAG_COLORS[h % TAG_COLORS.length];
}

function InboxPage() {
  const nav = useNavigate();
  const { data: isAdmin, isLoading: checking } = useIsAdmin();
  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!checking && isAdmin === false) nav({ to: "/profile" });
  }, [checking, isAdmin, nav]);

  const listFn = useServerFn(adminListInboxRooms);
  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["inbox-rooms"],
    enabled: isAdmin === true,
    refetchInterval: 15000,
    queryFn: () => listFn({}),
  });

  // auto-select first room on desktop
  useEffect(() => {
    if (!activeUserId && rooms.length > 0 && typeof window !== "undefined" && window.innerWidth >= 768) {
      setActiveUserId(rooms[0].user_id);
    }
  }, [rooms, activeUserId]);

  if (checking) {
    return (
      <AppShell>
        <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </AppShell>
    );
  }
  if (!isAdmin) return null;

  const activeRoom = rooms.find((r) => r.user_id === activeUserId) ?? null;

  return (
    <AppShell>
      <div className="mb-3 flex items-center gap-2">
        <Inbox className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">客服收件夾</h1>
      </div>

      <div className="card-surface flex h-[calc(100dvh-200px)] min-h-[480px] overflow-hidden md:h-[calc(100dvh-180px)]">
        {/* Room list (35% desktop / full mobile when no room selected) */}
        <aside
          className={`${activeUserId ? "hidden md:flex" : "flex"} w-full flex-col border-r border-border md:w-[35%]`}
        >
          <div className="border-b border-border bg-muted/30 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            對話列表（{rooms.length}）
          </div>
          {isLoading ? (
            <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="grid flex-1 place-items-center px-6 text-center text-sm text-muted-foreground">
              <div>
                <Inbox className="mx-auto mb-2 h-8 w-8 opacity-60" />
                還沒有任何對話
              </div>
            </div>
          ) : (
            <ul className="flex-1 divide-y divide-border overflow-y-auto">
              {rooms.map((r) => (
                <li key={r.user_id}>
                  <button
                    type="button"
                    onClick={() => setActiveUserId(r.user_id)}
                    className={`flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-secondary/60 ${
                      activeUserId === r.user_id ? "bg-secondary" : ""
                    }`}
                  >
                    <Avatar name={r.display_name ?? r.email ?? "?"} path={r.avatar_url} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold">
                          {r.display_name || r.email || r.user_id.slice(0, 8)}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {formatTime(r.last_message_at)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <p className="flex-1 truncate text-xs text-muted-foreground">
                          {r.last_message === "__TRANSFER_NOTICE__" ? "（系統提示）" : r.last_message}
                        </p>
                        {r.unread_count > 0 && (
                          <span className="grid min-w-[18px] place-items-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                            {r.unread_count > 99 ? "99+" : r.unread_count}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {!r.ai_enabled && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                            <UserCog className="h-2.5 w-2.5" /> 真人接手
                          </span>
                        )}
                        {r.tags.slice(0, 3).map((t) => (
                          <span key={t} className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${tagColor(t)}`}>
                            <Tag className="h-2.5 w-2.5" /> {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Chat window */}
        <section className={`${activeUserId ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
          {activeRoom ? (
            <ChatWindow room={activeRoom} onBack={() => setActiveUserId(null)} />
          ) : (
            <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-60" />
                請從左側選擇一個對話
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" });
}

function ChatWindow({ room, onBack }: { room: InboxRoom; onBack: () => void }) {
  const qc = useQueryClient();
  const getFn = useServerFn(adminGetRoomMessages);
  const replyFn = useServerFn(adminPostReply);
  const imgFn = useServerFn(adminPostImage);
  const takeoverFn = useServerFn(adminTakeoverRoom);
  const markReadFn = useServerFn(adminMarkRoomRead);
  const cannedQ = useCannedResponses(true);
  const [reply, setReply] = useState("");
  const [showCanned, setShowCanned] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const imgMut = useMutation({
    mutationFn: (path: string) => imgFn({ data: { targetUserId: room.user_id, path } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox-room", room.user_id] });
      qc.invalidateQueries({ queryKey: ["inbox-rooms"] });
    },
    onError: (e: Error) => alert(e.message),
  });

  const cannedList = useMemo(() => {
    const dbItems = (cannedQ.data ?? []).map((c) => ({ id: c.id, title: c.title, content: c.content }));
    return [...dbItems, ...DEFAULT_CANNED];
  }, [cannedQ.data]);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["inbox-room", room.user_id],
    refetchInterval: 10000,
    queryFn: () => getFn({ data: { targetUserId: room.user_id } }),
  });

  const replyMut = useMutation({
    mutationFn: (text: string) => replyFn({ data: { targetUserId: room.user_id, reply: text } }),
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["inbox-room", room.user_id] });
      qc.invalidateQueries({ queryKey: ["inbox-rooms"] });
      qc.invalidateQueries({ queryKey: ["support-unread-count"] });
      setTimeout(() => taRef.current?.focus(), 0);
    },
    onError: (e: Error) => alert(e.message),
  });

  const takeoverMut = useMutation({
    mutationFn: (enable: boolean) =>
      takeoverFn({ data: { targetUserId: room.user_id, enable } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox-room", room.user_id] });
      qc.invalidateQueries({ queryKey: ["inbox-rooms"] });
    },
    onError: (e: Error) => alert(e.message),
  });

  const markReadMut = useMutation({
    mutationFn: () => markReadFn({ data: { targetUserId: room.user_id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox-rooms"] });
      qc.invalidateQueries({ queryKey: ["support-unread-count"] });
    },
    onError: (e: Error) => alert(e.message),
  });

  useEffect(() => { taRef.current?.focus(); }, [room.user_id]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Build flat list of bubbles
  const bubbles = useMemo(() => buildBubbles(messages), [messages]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="grid h-9 w-9 place-items-center rounded-lg hover:bg-secondary md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar name={room.display_name ?? room.email ?? "?"} path={room.avatar_url} size={36} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-bold">
            {room.display_name || room.email || room.user_id.slice(0, 8)}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                room.ai_enabled
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
              }`}
            >
              {room.ai_enabled ? <Bot className="h-2.5 w-2.5" /> : <UserCog className="h-2.5 w-2.5" />}
              {room.ai_enabled ? "AI小幫手在線中" : "專員真人接手中"}
            </span>
            <span className="truncate text-[10px] text-muted-foreground">
              {room.email || room.user_id.slice(0, 12)}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => markReadMut.mutate()}
          disabled={markReadMut.isPending || room.unread_count === 0}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-bold hover:bg-secondary disabled:opacity-50"
          title="清除此對話的未讀紅點"
        >
          {markReadMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          已讀
        </button>
        <button
          type="button"
          onClick={() => takeoverMut.mutate(room.ai_enabled)}
          disabled={takeoverMut.isPending}
          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition disabled:opacity-60 ${
            room.ai_enabled
              ? "bg-primary text-primary-foreground hover:brightness-110"
              : "border border-border bg-card hover:bg-secondary"
          }`}
          title={room.ai_enabled ? "接手後 AI 將不再自動回覆此使用者" : "交還 AI 自動回覆"}
        >
          {takeoverMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCog className="h-3 w-3" />}
          {room.ai_enabled ? "接手對話" : "交還 AI"}
        </button>
      </div>

      {/* Body */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-muted/20 p-4">
        {isLoading ? (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : bubbles.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
            <div>還沒有訊息</div>
          </div>
        ) : (
          bubbles.map((b, i) => <Bubble key={i} bubble={b} userName={room.display_name ?? room.email} userAvatar={room.avatar_url} />)
        )}
      </div>

      {/* Composer */}
      <form
        className="relative border-t border-border bg-card p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const t = reply.trim();
          if (!t || replyMut.isPending) return;
          replyMut.mutate(t);
        }}
      >
        {showCanned && cannedList.length > 0 && (
          <div className="absolute bottom-full left-3 right-3 mb-2 max-h-60 overflow-y-auto rounded-lg border border-border bg-card shadow-[var(--shadow-elevated)]">
            <div className="border-b border-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              常用罐頭回覆（{cannedList.length}）
            </div>
            <ul className="divide-y divide-border">
              {cannedList.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setReply((p) => (p ? p + "\n" + c.content : c.content));
                      setShowCanned(false);
                      setTimeout(() => taRef.current?.focus(), 0);
                    }}
                    className="block w-full px-3 py-2 text-left text-xs hover:bg-secondary"
                  >
                    <div className="font-bold">{c.title}</div>
                    <div className="mt-0.5 line-clamp-2 text-muted-foreground">{c.content}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => setShowCanned((v) => !v)}
            className="btn-touch inline-flex items-center gap-1 rounded-lg border border-border bg-secondary px-2.5 text-xs font-semibold hover:bg-secondary/80"
            title="常用罐頭回覆"
          >
            罐頭 <ChevronDown className="h-3 w-3" />
          </button>
          <textarea
            ref={taRef}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const t = reply.trim();
                if (t && !replyMut.isPending) replyMut.mutate(t);
              }
            }}
            placeholder="輸入回覆…（Enter 送出 / Shift+Enter 換行）"
            rows={2}
            className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            disabled={replyMut.isPending || !reply.trim()}
            className="btn-touch inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-elevated)] hover:brightness-110 disabled:opacity-60"
          >
            {replyMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            送出
          </button>
        </div>
      </form>
    </>
  );
}

type Bubble =
  | { kind: "user"; text: string; at: string }
  | { kind: "ai"; text: string; at: string; tags: string[] }
  | { kind: "admin"; text: string; at: string }
  | { kind: "system"; text: string; at: string };

function buildBubbles(rows: any[]): Bubble[] {
  const out: Bubble[] = [];
  let lastAi: boolean | null = null;
  for (const r of rows) {
    if (r.admin_reply === "__TRANSFER_NOTICE__") {
      out.push({ kind: "system", text: "AI小幫手已將此對話轉交給真人客服", at: r.created_at });
      lastAi = false;
      continue;
    }
    // detect AI→human transition implicitly if no notice row exists
    const aiNow = r.ai_enabled !== false;
    if (lastAi === true && !aiNow) {
      out.push({ kind: "system", text: "AI小幫手已將此對話轉交給真人客服", at: r.created_at });
    }
    lastAi = aiNow;

    if (r.question) out.push({ kind: "user", text: r.question, at: r.created_at });
    if (r.ai_answer) out.push({ kind: "ai", text: r.ai_answer, at: r.created_at, tags: r.tags ?? [] });
    if (r.admin_reply) out.push({ kind: "admin", text: r.admin_reply, at: r.replied_at ?? r.created_at });
  }
  return out;
}

function Bubble({ bubble, userName, userAvatar }: { bubble: Bubble; userName?: string | null; userAvatar?: string | null }) {
  if (bubble.kind === "system") {
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">
          ⚡ {bubble.text}
        </span>
      </div>
    );
  }
  if (bubble.kind === "user") {
    return (
      <div className="flex items-start gap-2">
        <Avatar name={userName ?? "U"} path={userAvatar} size={28} />
        <div className="max-w-[80%]">
          <div className="mb-0.5 text-[10px] font-semibold text-muted-foreground">{userName ?? "使用者"}</div>
          <div className="rounded-2xl rounded-tl-sm bg-card px-3.5 py-2 text-sm shadow-sm">
            <div className="whitespace-pre-wrap break-words">{bubble.text}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">{new Date(bubble.at).toLocaleString("zh-TW")}</div>
          </div>
        </div>
      </div>
    );
  }
  if (bubble.kind === "ai") {
    return (
      <div className="flex items-start gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
          <Bot className="h-3.5 w-3.5" />
        </span>
        <div className="max-w-[80%]">
          <div className="mb-0.5 text-[10px] font-semibold text-muted-foreground">AI小幫手</div>
          <div className="rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2 text-sm shadow-sm">
            <div className="whitespace-pre-wrap break-words">{bubble.text}</div>
            {bubble.tags?.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {bubble.tags.map((t) => (
                  <span key={t} className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${tagColor(t)}`}>
                    <Tag className="h-2.5 w-2.5" /> {t}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-1 text-[10px] text-muted-foreground">{new Date(bubble.at).toLocaleString("zh-TW")}</div>
          </div>
        </div>
      </div>
    );
  }
  // admin
  return (
    <div className="flex items-start justify-end gap-2">
      <div className="max-w-[80%]">
        <div className="mb-0.5 text-right text-[10px] font-semibold text-primary">
          <CircleUserRound className="mr-0.5 inline h-3 w-3" /> 管理員
        </div>
        <div className="rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground shadow-sm">
          <div className="whitespace-pre-wrap break-words">{bubble.text}</div>
          <div className="mt-1 text-[10px] opacity-80">{new Date(bubble.at).toLocaleString("zh-TW")}</div>
        </div>
      </div>
    </div>
  );
}
