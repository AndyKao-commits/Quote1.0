import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

export async function exportQuotePdf(filename = "報價單.pdf") {
  const src = document.getElementById("quote-document");
  if (!src) throw new Error("找不到報價預覽，請先切換到預覽再試");

  const clone = src.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  clone.style.position = "fixed";
  clone.style.left = "0";
  clone.style.top = "0";
  clone.style.zIndex = "-1";
  clone.style.width = "210mm";
  clone.style.maxWidth = "210mm";
  clone.style.visibility = "hidden";
  clone.style.pointerEvents = "none";
  document.body.appendChild(clone);

  try {
    await new Promise((r) => setTimeout(r, 150));
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: clone.scrollWidth,
      height: clone.scrollHeight,
      windowWidth: clone.scrollWidth,
    });

    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    const img = canvas.toDataURL("image/png", 1.0);

    let y = 0;
    let remaining = imgH;
    let page = 0;
    while (remaining > 0) {
      if (page > 0) pdf.addPage();
      pdf.addImage(img, "PNG", 0, -y, imgW, imgH);
      y += pageH;
      remaining -= pageH;
      page++;
      if (page > 20) break;
    }

    pdf.save(filename.replace(/[<>:"/\\|?*]/g, "_"));
  } finally {
    clone.remove();
  }
}
