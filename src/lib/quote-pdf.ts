import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

/** A4 直式 @ 96dpi（210×297mm） */
export const QUOTE_PAGE_WIDTH_PX = 794;
export const QUOTE_PAGE_HEIGHT_PX = 1123;

async function waitForPaint(ms = 200) {
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise((r) => setTimeout(r, ms));
}

function prepPageForCapture(el: HTMLElement) {
  const prev = {
    width: el.style.width,
    height: el.style.height,
    minHeight: el.style.minHeight,
    maxWidth: el.style.maxWidth,
    boxSizing: el.style.boxSizing,
    overflow: el.style.overflow,
  };
  el.style.width = `${QUOTE_PAGE_WIDTH_PX}px`;
  el.style.height = `${QUOTE_PAGE_HEIGHT_PX}px`;
  el.style.minHeight = `${QUOTE_PAGE_HEIGHT_PX}px`;
  el.style.maxWidth = `${QUOTE_PAGE_WIDTH_PX}px`;
  el.style.boxSizing = "border-box";
  el.style.overflow = "hidden";
  return () => {
    el.style.width = prev.width;
    el.style.height = prev.height;
    el.style.minHeight = prev.minHeight;
    el.style.maxWidth = prev.maxWidth;
    el.style.boxSizing = prev.boxSizing;
    el.style.overflow = prev.overflow;
  };
}

/** 在畫面外擷取，不遮蓋使用者介面 */
async function collectQuotePages(): Promise<{ pages: HTMLElement[]; restore: () => void }> {
  const root = document.getElementById("quote-document-fallback");
  if (!root) {
    throw new Error("找不到報價預覽，請重新整理後再試");
  }

  const pages = Array.from(root.querySelectorAll<HTMLElement>("[data-quote-page]"));
  if (!pages.length) {
    throw new Error("找不到報價頁面，請確認已有明細資料");
  }

  const prevRoot = {
    position: root.style.position,
    left: root.style.left,
    top: root.style.top,
    width: root.style.width,
    height: root.style.height,
    zIndex: root.style.zIndex,
    visibility: root.style.visibility,
    opacity: root.style.opacity,
    pointerEvents: root.style.pointerEvents,
    clip: root.style.clip,
  };

  root.style.position = "fixed";
  root.style.left = "-12000px";
  root.style.top = "0";
  root.style.width = `${QUOTE_PAGE_WIDTH_PX}px`;
  root.style.height = "auto";
  root.style.zIndex = "-1";
  root.style.visibility = "visible";
  root.style.opacity = "1";
  root.style.pointerEvents = "none";
  root.style.clip = "auto";

  const restorePages = pages.map((p) => prepPageForCapture(p));

  await waitForPaint();

  return {
    pages,
    restore: () => {
      restorePages.forEach((fn) => fn());
      root.style.position = prevRoot.position;
      root.style.left = prevRoot.left;
      root.style.top = prevRoot.top;
      root.style.width = prevRoot.width;
      root.style.height = prevRoot.height;
      root.style.zIndex = prevRoot.zIndex;
      root.style.visibility = prevRoot.visibility;
      root.style.opacity = prevRoot.opacity;
      root.style.pointerEvents = prevRoot.pointerEvents;
      root.style.clip = prevRoot.clip;
    },
  };
}

export async function exportQuotePdf(filename = "報價單.pdf") {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const { pages, restore } = await collectQuotePages();

  try {
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pages.length; i++) {
      const el = pages[i];
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: QUOTE_PAGE_WIDTH_PX,
        height: QUOTE_PAGE_HEIGHT_PX,
        windowWidth: QUOTE_PAGE_WIDTH_PX,
        windowHeight: QUOTE_PAGE_HEIGHT_PX,
      });

      if (!canvas.width || !canvas.height) {
        throw new Error("PDF 產生失敗：無法擷取預覽內容");
      }

      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

      if (i > 0) pdf.addPage();
      // A4 直式滿版：貼齊四邊，不留白邊
      pdf.addImage(dataUrl, "JPEG", 0, 0, pageW, pageH);
    }

    pdf.save(filename.replace(/[<>:"/\\|?*]/g, "_"));
  } finally {
    restore();
  }
}
