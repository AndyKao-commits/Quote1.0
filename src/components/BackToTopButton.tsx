import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

type BackToTopButtonProps = {
  variant?: "inline" | "floating";
  className?: string;
};

export function BackToTopButton({ variant = "inline", className = "" }: BackToTopButtonProps) {
  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  if (variant === "floating") {
    return (
      <button
        type="button"
        onClick={scrollTop}
        className={`quote-back-to-top-fab bdg-btn bdg-btn-primary fixed z-30 flex items-center gap-1.5 rounded-full px-4 py-2.5 shadow-lg ${className}`}
        aria-label="回到頂部"
      >
        <ArrowUp className="h-4 w-4" />
        回到頂部
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={scrollTop}
      className={`bdg-btn bdg-btn-secondary flex w-full items-center justify-center gap-2 py-3 ${className}`}
    >
      <ArrowUp className="h-4 w-4" />
      回到頂部
    </button>
  );
}

export function useShowBackToTop(threshold = 320) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return visible;
}
