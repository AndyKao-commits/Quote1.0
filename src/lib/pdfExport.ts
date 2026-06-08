import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import { supabase } from "@/integrations/supabase/client";
import { statusLabel, type Material, type Photo, type Project, type WorkLog } from "./db";

async function pathToDataUrl(path: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage.from("photos").download(path);
    if (error || !data) return null;
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(data);
    });
  } catch { return null; }
}

interface ExportData {
  project: Project;
  logs: WorkLog[];
  photos: Photo[];
  materials: Material[];
}

export async function exportProjectPdf({ project, logs, photos, materials }: ExportData) {
  // Pre-fetch photo data URLs
  const photosWithUrl = await Promise.all(
    photos.map(async (p) => ({ ...p, dataUrl: await pathToDataUrl(p.storage_path) })),
  );

  const photoByCat = {
    before: photosWithUrl.filter((p) => p.category === "before"),
    during: photosWithUrl.filter((p) => p.category === "during"),
    after: photosWithUrl.filter((p) => p.category === "after"),
  };

  const totalHours = logs.reduce((s, l) => s + Number(l.hours || 0), 0);
  const materialTotal = materials.reduce((s, m) => s + Number(m.quantity) * Number(m.unit_price), 0);

  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-99999px;top:0;width:794px;background:#fff;color:#111;font-family:'Noto Sans TC',system-ui,sans-serif;padding:40px;";
  container.innerHTML = `
    <style>
      .pdf-h1{font-size:28px;font-weight:800;letter-spacing:-.02em;margin:0 0 4px;}
      .pdf-h2{font-size:18px;font-weight:700;margin:24px 0 10px;padding-bottom:6px;border-bottom:2px solid #1E40AF;color:#1E40AF;}
      .pdf-meta{display:grid;grid-template-columns:120px 1fr;gap:6px 12px;font-size:13px;}
      .pdf-meta dt{color:#666;font-weight:600;}
      .pdf-meta dd{margin:0;}
      table{width:100%;border-collapse:collapse;font-size:12px;}
      th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top;}
      th{background:#f3f4f6;font-weight:700;}
      .photo-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
      .photo-card{border:1px solid #ddd;border-radius:6px;overflow:hidden;page-break-inside:avoid;}
      .photo-card img{width:100%;height:auto;display:block;}
      .photo-card .cap{padding:6px 8px;font-size:11px;color:#444;}
      .badge{display:inline-block;padding:2px 8px;border-radius:999px;background:#1E40AF;color:#fff;font-size:11px;font-weight:700;}
      .muted{color:#666;font-size:12px;}
      .sign-box{margin-top:40px;border:1px dashed #999;border-radius:8px;padding:20px;text-align:center;color:#999;font-size:13px;min-height:100px;}
    </style>
    <div style="border-bottom:3px solid #1E40AF;padding-bottom:14px;margin-bottom:18px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;">
        <div>
          <div class="muted" style="font-weight:600;letter-spacing:.2em;text-transform:uppercase;">FIELD LOG · 施工報告</div>
          <h1 class="pdf-h1">${esc(project.name)}</h1>
        </div>
        <div class="badge">${statusLabel(project.status)}</div>
      </div>
    </div>

    <h2 class="pdf-h2">基本資料</h2>
    <dl class="pdf-meta">
      <dt>客戶姓名</dt><dd>${esc(project.customer_name)}</dd>
      ${project.customer_phone ? `<dt>客戶電話</dt><dd>${esc(project.customer_phone)}</dd>` : ""}
      <dt>工程地址</dt><dd>${esc(project.address)}</dd>
      <dt>開工日期</dt><dd>${esc(project.start_date)}</dd>
      ${project.expected_end_date ? `<dt>預計完工</dt><dd>${esc(project.expected_end_date)}</dd>` : ""}
      <dt>工程狀態</dt><dd>${statusLabel(project.status)}</dd>
      ${project.scope ? `<dt>工程內容</dt><dd>${esc(project.scope).replace(/\n/g, "<br>")}</dd>` : ""}
    </dl>

    <h2 class="pdf-h2">施工日誌（共 ${logs.length} 筆 · 累計 ${totalHours} 工時）</h2>
    ${logs.length === 0 ? `<p class="muted">無施工日誌</p>` : `
    <table>
      <thead><tr><th style="width:90px;">日期</th><th>施工內容</th><th style="width:60px;">工時</th><th style="width:90px;">人員</th><th>備註</th></tr></thead>
      <tbody>${[...logs].sort((a,b)=>a.date<b.date?1:-1).map(l=>`
        <tr>
          <td>${esc(l.date)}</td>
          <td>${esc(l.content).replace(/\n/g,"<br>")}</td>
          <td>${l.hours}h</td>
          <td>${esc(l.workers || "")}</td>
          <td>${esc(l.note || "")}</td>
        </tr>`).join("")}</tbody>
    </table>`}

    <h2 class="pdf-h2">材料紀錄（共 ${materials.length} 項 · 合計 NT$ ${materialTotal.toLocaleString()}）</h2>
    ${materials.length === 0 ? `<p class="muted">無材料紀錄</p>` : `
    <table>
      <thead><tr><th>品項</th><th style="width:80px;">品牌</th><th style="width:60px;">數量</th><th style="width:50px;">單位</th><th style="width:80px;">單價</th><th style="width:90px;">金額</th></tr></thead>
      <tbody>${materials.map(m=>`
        <tr>
          <td>${esc(m.name)}</td>
          <td>${esc(m.brand || "")}</td>
          <td>${m.quantity}</td>
          <td>${esc(m.unit)}</td>
          <td>NT$ ${Number(m.unit_price).toLocaleString()}</td>
          <td><b>NT$ ${(Number(m.quantity) * Number(m.unit_price)).toLocaleString()}</b></td>
        </tr>`).join("")}
        <tr><td colspan="5" style="text-align:right;font-weight:700;">合計</td><td><b>NT$ ${materialTotal.toLocaleString()}</b></td></tr>
      </tbody>
    </table>`}

    ${(["before", "during", "after"] as const).map(cat => {
      const items = photoByCat[cat].filter(p => p.dataUrl);
      if (items.length === 0) return "";
      const label = cat === "before" ? "施工前" : cat === "during" ? "施工中" : "完工後";
      return `
        <h2 class="pdf-h2">照片紀錄 — ${label}（${items.length} 張）</h2>
        <div class="photo-grid">
          ${items.map(p => `
            <div class="photo-card">
              <img src="${p.dataUrl}" alt="" />
              <div class="cap"><b>${esc(p.taken_at)}</b>${p.note ? ` · ${esc(p.note)}` : ""}</div>
            </div>`).join("")}
        </div>`;
    }).join("")}

    <h2 class="pdf-h2">客戶簽名</h2>
    <div class="sign-box">客戶簽名：________________________________________<br><br>日期：________________</div>

    <p class="muted" style="margin-top:30px;text-align:center;">— 由「現場紀錄」生成．${new Date().toLocaleString("zh-TW")} —</p>
  `;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let position = 0;
    let heightLeft = imgHeight;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

    pdf.addImage(dataUrl, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(dataUrl, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const fileName = `${project.name.replace(/[^\w\u4e00-\u9fa5-]/g, "_")}_施工報告.pdf`;
    pdf.save(fileName);

    // Try Web Share API for native share (LINE/Email)
    try {
      const blob = pdf.output("blob");
      if (navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: "application/pdf" })] })) {
        const file = new File([blob], fileName, { type: "application/pdf" });
        await navigator.share({ files: [file], title: project.name, text: `${project.name} 施工報告` });
      }
    } catch { /* user cancel ok */ }
  } finally {
    document.body.removeChild(container);
  }
}

function esc(s: string) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}
