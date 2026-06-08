import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  question: z.string().trim().min(1).max(1000),
});

const AnswerSchema = z.object({
  canAnswer: z.boolean(),
  answer: z.string(),
  tags: z.array(z.string()).optional(),
  summary: z.string().optional(),
});

const VAGUE_PATTERNS = [
  "不知道", "不清楚", "無法回答", "無法回覆", "抱歉", "我不確定",
  "i don't know", "i'm not sure", "sorry",
];

const SYSTEM_PROMPT = `你是「施工紀錄 PRO」App 的客服小幫手，名字叫「AI小幫手」。這是一款給水電/工程師傅使用的施工紀錄 App。

主要功能：
- 案件管理（新增、編輯、狀態：待施工/施工中/驗收中/已完工）
- 施工日誌、照片管理（前/中/後，含浮水印開關）、材料管理（含 AI 掃描估價單）
- 案件 PDF 匯出、GPS 自動帶入地址、多裝置雲端同步、管理員面板、團隊協作、客服收件夾

回覆規則：
- canAnswer=true 代表你可以直接回覆（包含 App 使用問題、以及一般的日常閒聊問候，如「你好」「謝謝」「辛苦了」「今天天氣」「在嗎」「現在幾點」「吃飽沒」等寒暄）。
- 對於日常寒暄、感謝、鼓勵、表情回覆等社交互動，請用親切自然的繁體中文回應 1-2 句，並可主動關心師傅工作狀況或邀請他詢問 App 問題。**不要**轉交給管理員。
- canAnswer=false 只在「跟 App 使用無關的專業技術問題（例如水電法規、報價計算、客戶糾紛、要求人工服務）」或「需要管理員人工處理（例如帳號鎖定、付款問題、客訴）」時才使用，並回覆「這題我先幫您轉給管理員專員，稍後會回覆您 🙏」。
- answer 一律繁體中文，2-4 句，語氣親切、簡潔、像認識的同事。
- tags 1-3 個中文短標籤（例：#閒聊、#問候、#案件、#照片、#PDF、#帳號、#其他）。
- summary 用一句話（≤20 字）摘要使用者問題，供管理員快速判讀。`;

export const askSupport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;

    const { data: lastRow } = await (supabase as any)
      .from("support_messages")
      .select("ai_enabled, takeover_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let humanTakeover = lastRow?.ai_enabled === false;
    if (humanTakeover && lastRow?.takeover_at) {
      const ageMs = Date.now() - new Date(lastRow.takeover_at).getTime();
      // Auto-revert to AI after 5 minutes of inactivity in human-takeover mode.
      if (ageMs > 5 * 60 * 1000) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await (supabaseAdmin as any)
          .from("support_messages")
          .update({ ai_enabled: true, takeover_at: null })
          .eq("user_id", userId);
        humanTakeover = false;
      }
    }

    if (humanTakeover) {
      const { data: row, error } = await (supabase as any)
        .from("support_messages")
        .insert({
          user_id: userId,
          question: data.question,
          ai_answer: null,
          status: "escalated",
          ai_enabled: false,
          tags: ["#真人接手"],
          summary: data.question.slice(0, 20),
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { id: row.id, status: "escalated", answer: "" };
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI 服務未設定");

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-2.5-flash");

    let result: { canAnswer: boolean; answer: string; tags?: string[]; summary?: string };
    try {
      const { output } = await generateText({
        model,
        output: Output.object({ schema: AnswerSchema }),
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: data.question },
        ],
      });
      result = output;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("429")) throw new Error("AI 服務忙碌中，請稍後再試");
      if (msg.includes("402")) throw new Error("AI 額度已用盡，請至工作區加值");
      console.error("support ai error", e);
      result = {
        canAnswer: false,
        answer: "這題考倒我了！🤖 我已經幫您把問題轉交給真人專員，我們會盡快回覆您，謝謝您的耐心等待！",
        tags: ["#其他"],
        summary: data.question.slice(0, 20),
      };
    }

    const ans = (result.answer || "").toLowerCase();
    const vague = VAGUE_PATTERNS.some((k) => ans.includes(k));
    const canAnswer = result.canAnswer && !vague;
    if (!canAnswer && result.canAnswer) {
      result.answer = "這題考倒我了！🤖 我已經幫您把問題轉交給真人專員，我們會盡快回覆您，謝謝您的耐心等待！";
    }

    const status = canAnswer ? "answered" : "escalated";
    const { data: row, error } = await (supabase as any)
      .from("support_messages")
      .insert({
        user_id: userId,
        question: data.question,
        ai_answer: result.answer,
        status,
        tags: result.tags ?? [],
        summary: result.summary ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    return { id: row.id, status, answer: result.answer };
  });

// User uploads an image into the support thread. Path must be under support/{userId}/.
export const userPostImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ path: z.string().min(1).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const expectedPrefix = `support/${userId}/`;
    if (!data.path.startsWith(expectedPrefix)) throw new Error("路徑不合法");

    const { data: lastRow } = await (supabase as any)
      .from("support_messages")
      .select("ai_enabled")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const humanTakeover = lastRow?.ai_enabled === false;

    const { error } = await (supabase as any).from("support_messages").insert({
      user_id: userId,
      question: "[圖片]",
      image_url: data.path,
      status: humanTakeover ? "escalated" : "answered",
      ai_enabled: !humanTakeover,
      tags: humanTakeover ? ["#真人接手"] : ["#圖片"],
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
