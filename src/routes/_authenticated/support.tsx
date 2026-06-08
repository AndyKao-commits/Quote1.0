import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Send, Bot, Loader2, Inbox, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { askSupport } from "@/lib/support.functions";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/db";
import { Avatar } from "@/components/Avatar";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({ meta: [{ title: "AI 客服 — 現場紀錄" }] }),
  component: SupportPage,
});

interface Msg {
  id: string;
  question: string;
  ai_answer: string | null;
  admin_reply: string | null;
  status: string;
  created_at: string;
  replied_at: string | null;
}

const AI_NAME = "AI小幫手";
const ADMIN_NAME = "客服專員";

function SupportPage() {
  const qc = useQueryClient();
  const askFn = useServerFn(askSupport);
  const { data: profile } = useProfile();
  const [input, setInput] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery({
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
      // Hide internal system rows from end-user view
      return ((data ?? []) as Msg[]).filter(
        (m) => m.admin_reply !== "__TRANSFER_NOTICE__",
      );
    },
    refetchInterval: 15000,
  });

  const mut = useMutation({
    mutationFn: (question: string) => askFn({ data: { question } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support-messages"] });
      setInput("");
      setTimeout(() => taRef.current?.focus(), 0);
    },
    onError: (e: Error) => alert(e.message || "送出失敗"),
  });

  useEffect(() => { taRef.current?.focus(); }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, mut.isPending]);

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
              <Bot className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-bold">{AI_NAME}</div>
              <div className="text-[11px] text-muted-foreground">線上 · 真人接手會自動轉接</div>
            </div>
          </div>
        </div>
        <ChatBody
          scrollRef={scrollRef}
          isLoading={isLoading}
          messages={messages}
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
        />
      </div>

      {/* Desktop view */}
      <div className="hidden md:block">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">AI 客服</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          詢問 App 使用問題，AI 立即回覆。AI 無法回答的問題會自動轉交管理員。
        </p>

        <div className="card-surface mt-6 flex h-[65vh] min-h-[480px] flex-col overflow-hidden">
          <ChatBody
            scrollRef={scrollRef}
            isLoading={isLoading}
            messages={messages}
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
          />
        </div>
      </div>
    </AppShell>
  );
}

function ChatBody({
  scrollRef, isLoading, messages, pending, userName, userAvatar,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  isLoading: boolean;
  messages: Msg[];
  pending: boolean;
  userName?: string | null;
  userAvatar?: string | null;
}) {
  return (
    <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
      {isLoading ? (
        <div className="grid h-full place-items-center text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : messages.length === 0 ? (
        <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
          <div>
            <Inbox className="mx-auto mb-2 h-8 w-8 opacity-60" />
            還沒有訊息。試著問問：<br />
            「怎麼新增案件？」「如何關掉照片浮水印？」
          </div>
        </div>
      ) : (
        messages.map((m) => (
          <MessageRow key={m.id} m={m} userName={userName} userAvatar={userAvatar} />
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

function Composer({
  taRef, input, setInput, onSend, pending,
}: {
  taRef: React.RefObject<HTMLTextAreaElement | null>;
  input: string;
  setInput: (v: string) => void;
  onSend: (q: string) => void;
  pending: boolean;
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
        disabled={pending || !input.trim()}
        className="btn-touch inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-elevated)] hover:brightness-110 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        送出
      </button>
    </form>
  );
}

function MessageRow({ m, userName, userAvatar }: { m: Msg; userName?: string | null; userAvatar?: string | null }) {
  return (
    <div className="space-y-2">
      {/* user */}
      <div className="flex justify-end">
        <div className="flex max-w-[85%] items-start gap-2">
          <div className="rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground shadow-sm">
            <div className="whitespace-pre-wrap break-words">{m.question}</div>
            <div className="mt-1 text-[10px] opacity-70">
              {new Date(m.created_at).toLocaleString("zh-TW")}
            </div>
          </div>
          <Avatar name={userName ?? "您"} path={userAvatar} size={28} />
        </div>
      </div>

      {/* AI */}
      {m.ai_answer && (
        <div className="flex justify-start">
          <div className="flex max-w-[85%] items-start gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
              <Bot className="h-3.5 w-3.5" />
            </span>
            <div className="space-y-1">
              <div className="text-[10px] font-semibold text-muted-foreground">{AI_NAME}</div>
              <div className="rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2 text-sm text-foreground shadow-sm">
                <div className="whitespace-pre-wrap break-words">{m.ai_answer}</div>
              </div>
              {m.status === "escalated" && !m.admin_reply && (
                <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  已轉交管理員，等待回覆中…
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* admin */}
      {m.admin_reply && (
        <div className="flex justify-start">
          <div className="flex max-w-[85%] items-start gap-2">
            <Avatar name={ADMIN_NAME} size={28} />
            <div className="space-y-1">
              <div className="text-[10px] font-semibold text-muted-foreground">{ADMIN_NAME}</div>
              <div className="rounded-2xl rounded-tl-sm border border-primary/30 bg-primary/5 px-3.5 py-2 text-sm shadow-sm">
                <div className="whitespace-pre-wrap break-words">{m.admin_reply}</div>
                {m.replied_at && (
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(m.replied_at).toLocaleString("zh-TW")}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
