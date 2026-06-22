import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

export async function exportQuotePdf(filename = "報價單.pdf") {
  const el = document.getElementById("quote-document");
  if (!el) throw new Error("找不到報價預覽");
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  const img = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const w = pdf.internal.pageSize.getWidth();
  const h = (canvas.height * w) / canvas.width;
  pdf.addImage(img, "PNG", 0, 0, w, h);
  pdf.save(filename);
}
