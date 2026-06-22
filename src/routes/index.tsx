import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, FileText } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "報得過 — 三分鐘做出客戶願意簽的報價" }] }),
  component: Landing,
});

function Landing() {
  const [paper, setPaper] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPaper(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="bdg-theme min-h-screen overflow-hidden bg-[#F5F0E8]">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-4 py-5">
        <span className="font-display text-xl font-bold text-[#1a1612]">報得過</span>
        <Link to="/auth" className="text-sm font-semibold text-[#6b5c4d] hover:text-[#1a1612]">
          登入
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-20 pt-6 md:pt-12">
        <p className="text-xs font-semibold tracking-[0.28em] text-[#C45A3C]">FOR FIELD & STUDIO</p>
        <h1 className="mt-4 max-w-lg text-4xl font-bold leading-[1.15] tracking-tight text-[#1a1612] md:text-5xl">
          三分鐘，
          <br />
          做出客戶願意簽的報價。
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-[#6b5c4d]">
          給師傅、統包、剛接案的設計師。填完項目，右邊就是給客戶看的樣子。
        </p>

        <Link
          to="/auth"
          onClick={() => setPaper(true)}
          className="group mt-8 inline-flex items-center gap-2 rounded-full bg-[#C45A3C] px-7 py-3.5 text-base font-bold text-white shadow-lg transition hover:brightness-105"
        >
          開始做報價
          <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
        </Link>

        <div className="relative mt-14 flex justify-center md:mt-20">
          <div
            className={`relative w-full max-w-sm transition-all duration-700 ease-out md:max-w-md ${
              paper ? "translate-y-0 opacity-100 rotate-0" : "translate-y-16 opacity-0 rotate-2"
            }`}
          >
            <div className="rounded-sm border border-[#d9cfc0] bg-white p-6 shadow-[0_24px_60px_-20px_rgba(26,22,18,0.25)] md:p-8">
              <div className="flex items-center justify-between border-b border-[#e8dfd3] pb-3">
                <span className="text-xs font-semibold text-[#6b5c4d]">陳師傅工程</span>
                <FileText className="h-4 w-4 text-[#C45A3C]" />
              </div>
              <p className="mt-4 font-display text-lg font-bold">浴室翻新報價</p>
              <div className="mt-4 space-y-2 text-xs text-[#3d342b]">
                {["拆除工程", "防水工程", "泥作復坪"].map((r) => (
                  <div key={r} className="flex justify-between border-b border-dashed border-[#ece3d6] py-1.5">
                    <span>{r}</span>
                    <span className="font-medium">—</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-between text-sm font-bold text-[#C45A3C]">
                <span>總計</span>
                <span>NT$ 128,000</span>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-[#8a7b6a]">PDF 預覽 · LINE 分享 · 項目庫 · 歷史複製</p>
      </main>
    </div>
  );
}
