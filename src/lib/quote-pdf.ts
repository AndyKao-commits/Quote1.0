import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

export async function exportQuotePdf(filename = "報價單.pdf") {
  const src = document.getElementById("quote-document");
  if (!src) throw new Error("找不到報價預覽");

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  // 等待離屏節點完成排版
  await new Promise((r) => setTimeout(r, 200));

  const canvas = await html2canvas(src, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    width: src.scrollWidth,
    height: src.scrollHeight,
    windowWidth: src.scrollWidth,
  });

  if (!canvas.width || !canvas.height) {
    throw new Error("PDF 產生失敗：無法擷取預覽內容，請重新整理後再試");
  }

  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const dataUrl = canvas.toDataURL("image/jpeg", 0.95);

  if (imgHeight <= pageHeight) {
    pdf.addImage(dataUrl, "JPEG", 0, 0, imgWidth, imgHeight);
  } else {
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(dataUrl, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(dataUrl, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
  }

  pdf.save(filename.replace(/[<>:"/\\|?*]/g, "_"));
}
