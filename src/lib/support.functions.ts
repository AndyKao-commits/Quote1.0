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

const SYSTEM_PROMPT = `你是「現場紀錄」App 的客服助理「AI小幫手」。這是一款給水電/工程師傅使用的施工紀錄 App。

主要功能：
- 案件管理（新增、編輯、狀態：待施工/施工中/驗收中/已完工）
- 施工日誌、照片管理（前/中/後，含浮水印開關）、材料管理（含 AI 掃描估價單）
- 案件 PDF 匯出、GPS 自動帶入地址、多裝置雲端同步、管理員面板

輸出規則（必填欄位）：
- canAnswer: true 代表你能直接回答 App 使用問題；false 代表問題與 App 無關、太模糊或你不確定
- answer: 繁體中文 2-4 句。若 canAnswer=false 請回覆「這題我先幫您轉給管理員專員，稍後會回覆您 🙏」
- tags: 1-3 個中文短標籤（例：#案件、#照片、#PDF、#帳號、#其他）
- summary: 用一句話（最多 20 字）摘要使用者的問題，供管理員快速判讀

語氣親切簡短；只回答跟本 App 使用方式有關的問題。`;

export const askSupport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data, context }) => {
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

    // Keyword fallback: even if AI says canAnswer=true, downgrade if answer contains vague terms
    const ans = (result.answer || "").toLowerCase();
    const vague = VAGUE_PATTERNS.some((k) => ans.includes(k));
    const canAnswer = result.canAnswer && !vague;
    if (!canAnswer && result.canAnswer) {
      result.answer = "這題考倒我了！🤖 我已經幫您把問題轉交給真人專員，我們會盡快回覆您，謝謝您的耐心等待！";
    }

    const status = canAnswer ? "answered" : "escalated";
    const { supabase, userId } = context;
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
