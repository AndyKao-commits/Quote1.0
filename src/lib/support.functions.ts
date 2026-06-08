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
});

const SYSTEM_PROMPT = `你是「現場紀錄」App 的客服助理。這是一款給水電/工程師傅使用的施工紀錄 App。

主要功能：
- 案件管理（新增、編輯、狀態：待施工/施工中/驗收中/已完工）
- 施工日誌（每日工時、內容、工人）
- 照片管理（施工前/中/後，含浮水印開關，可在個人頁切換）
- 材料管理（手動或用 AI 掃描估價單照片自動填入）
- 案件 PDF 匯出（包含基本資料、日誌、材料、照片、簽名）
- GPS 定位自動帶入工程地址
- 多裝置雲端同步（Email 登入）
- 管理員可在「管理員面板」管理會員

回答規則：
- 只用繁體中文回答，語氣親切、簡短（2-4 句）。
- 只回答跟本 App 使用方式有關的問題。
- 如果問題與 App 無關（例如閒聊、其他軟體、私人問題、技術疑難、無法判斷的問題），把 canAnswer 設為 false，answer 用一句話告訴使用者「我會把您的問題轉給管理員，請稍候回覆」。
- 如果你能明確回答 App 使用問題，canAnswer 設為 true，answer 寫出實際解答。`;

export const askSupport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI 服務未設定");

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-2.5-flash");

    let result: { canAnswer: boolean; answer: string };
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
      result = { canAnswer: false, answer: "AI 暫時無法回覆，我已將您的問題轉給管理員。" };
    }

    const status = result.canAnswer ? "answered" : "escalated";
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("support_messages")
      .insert({
        user_id: userId,
        question: data.question,
        ai_answer: result.answer,
        status,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    return { id: row.id, status, answer: result.answer };
  });
