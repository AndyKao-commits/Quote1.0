import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// 估價單/報價單照片 -> 結構化材料清單
// 使用 Lovable AI Gateway（Gemini 視覺模型）

const InputSchema = z.object({
  imageDataUrl: z
    .string()
    .min(50)
    .max(15_000_000)
    .refine((s) => s.startsWith("data:image/"), "必須是 data URL 影像"),
});

const ItemSchema = z.object({
  name: z.string(),
  brand: z.string().optional().default(""),
  unit: z.string().optional().default("個"),
  quantity: z.number().nonnegative().default(1),
  unitPrice: z.number().nonnegative().default(0),
  note: z.string().optional().default(""),
});

export type ScannedItem = z.infer<typeof ItemSchema>;

const SYSTEM_PROMPT = `你是專業的水電工程估價單辨識助理。
使用者會給你一張估價單、報價單、出貨單或材料明細的照片。
請辨識其中的「材料項目」，回傳結構化 JSON。

規則：
- 只回傳「材料/商品」，不要回傳人工費、運費、稅金、總計、折扣。
- 數字必須是純數字（不要逗號、不要單位符號）。
- 若辨識不到單價或數量，填 0。
- 單位請用繁體中文簡寫，例如：個、組、米、捲、箱、支、片、套。
- 品牌欄位若無就留空字串。
- name 必須是繁體中文，保留型號（例如「舞光 4 吋崁燈 LED-25011」）。
- 必須只回傳 JSON，不要任何解釋文字或 markdown 標籤。

回傳格式：
{ "items": [ { "name": "...", "brand": "...", "unit": "...", "quantity": 0, "unitPrice": 0, "note": "" } ] }`;

export const scanQuote = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("AI 服務未設定（缺少 LOVABLE_API_KEY）");
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "請辨識這張估價單上的材料，回傳 JSON。" },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) {
      throw new Error("AI 服務忙碌中，請稍後再試（已達速率上限）");
    }
    if (res.status === 402) {
      throw new Error("AI 服務額度已用盡，請至工作區設定加值");
    }
    if (!res.ok) {
      const body = await res.text();
      console.error("AI gateway error", res.status, body);
      throw new Error(`AI 服務錯誤（${res.status}）`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("AI return not JSON", content.slice(0, 500));
      throw new Error("AI 回傳格式錯誤，請改用更清楚的照片再試一次");
    }

    const itemsRaw =
      (parsed as { items?: unknown[] }).items ??
      (Array.isArray(parsed) ? (parsed as unknown[]) : []);

    const items: ScannedItem[] = [];
    for (const it of itemsRaw) {
      const r = ItemSchema.safeParse(it);
      if (r.success && r.data.name?.trim()) items.push(r.data);
    }

    return { items };
  });
