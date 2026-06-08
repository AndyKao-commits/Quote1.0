import { Sparkles } from "lucide-react";

const QUOTES = [
  "今日的細心，是明日不被客訴的保證 ✨",
  "工地安全第一，回家才是最後一道工序 🦺",
  "拍照存證三步驟：前、中、後，省下無數爭議 📸",
  "好的紀錄，就是最好的口碑 💪",
  "每一個案件，都是一次累積信任的機會 🤝",
  "工序對了，速度自然就快了 ⚙️",
  "把今天的進度寫清楚，明天的自己會感謝你 📝",
  "材料用心選，客戶就會回頭找你 🛠️",
  "細節決定品質，準時決定口碑 ⏰",
  "保持微笑，連扳手都會更聽話 😄",
];

function pickToday() {
  const d = new Date();
  const day = d.getFullYear() * 1000 + (d.getMonth() + 1) * 50 + d.getDate();
  return QUOTES[day % QUOTES.length];
}

export function Marquee() {
  const today = pickToday();
  // duplicate for seamless loop
  const items = [today, ...QUOTES.filter((q) => q !== today)];
  const text = items.join("　•　");
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-primary/20 bg-primary/5">
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <div className="relative flex-1 overflow-hidden">
          <div className="flex whitespace-nowrap will-change-transform animate-[marquee_45s_linear_infinite]">
            <span className="pr-12 text-sm font-medium text-foreground/80">{text}</span>
            <span aria-hidden className="pr-12 text-sm font-medium text-foreground/80">{text}</span>
          </div>
        </div>
      </div>
      <style>{`@keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }`}</style>
    </div>
  );
}
