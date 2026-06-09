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
  brandName?: string;
}

function esc(s: string) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

function groupBy<T>(items: T[], pick: (t: T) => string): Array<[string, T[]]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = pick(it).slice(0, 10) || "—";
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(it);
  }
  return Array.from(m.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

async function renderToPdf(pages: HTMLElement[], fileName: string) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < pages.length; i++) {
    const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const imgW = pageWidth;
    const imgH = (canvas.height * imgW) / canvas.width;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    if (i > 0) pdf.addPage();
    // If a single source page is taller than A4, slice across multiple pages
    if (imgH <= pageHeight) {
      pdf.addImage(dataUrl, "JPEG", 0, 0, imgW, imgH);
    } else {
      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(dataUrl, "JPEG", 0, position, imgW, imgH);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(dataUrl, "JPEG", 0, position, imgW, imgH);
        heightLeft -= pageHeight;
      }
    }
  }

  // Page numbers
  const total = pdf.getNumberOfPages();
  pdf.setFontSize(9);
  pdf.setTextColor(140);
  for (let n = 1; n <= total; n++) {
    pdf.setPage(n);
    pdf.text(`${n} / ${total}`, pageWidth - 14, pageHeight - 6, { align: "right" });
  }
  pdf.save(fileName);
  return pdf;
}

export async function exportProjectPdf({ project, logs, photos, materials, brandName }: ExportData) {
  const photosWithUrl = await Promise.all(
    photos.map(async (p) => ({ ...p, dataUrl: await pathToDataUrl(p.storage_path) })),
  );
  const validPhotos = photosWithUrl.filter((p) => p.dataUrl);

  const totalHours = logs.reduce((s, l) => s + Number(l.hours || 0), 0);
  const materialTotal = materials.reduce((s, m) => s + Number(m.quantity) * Number(m.unit_price), 0);
  const brand = brandName || "施工紀錄 PRO";
  const now = new Date();
  const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;

  const photosByDate = groupBy(validPhotos, (p) => p.created_at);
  const logsByDate = groupBy([...logs], (l) => l.date);

  const baseStyle = `
    *{box-sizing:border-box;}
    body,div,h1,h2,h3,p,table,td,th,dl,dt,dd{margin:0;padding:0;}
    .page{width:794px;background:#fff;color:#0f172a;font-family:'Noto Sans TC',-apple-system,system-ui,sans-serif;padding:42px 48px;}
    .h-section{font-size:13px;font-weight:800;letter-spacing:.22em;color:#1e3a8a;text-transform:uppercase;}
    .h-section .bar{display:inline-block;width:24px;height:2px;background:#1e40af;vertical-align:middle;margin-right:8px;}
    .h-title{font-size:22px;font-weight:800;letter-spacing:-.01em;margin-top:6px;color:#0f172a;}
    .divider{height:1px;background:#e5e7eb;margin:18px 0;}
    table{width:100%;border-collapse:separate;border-spacing:0;font-size:12px;}
    th{background:#f8fafc;color:#475569;font-weight:700;text-align:left;padding:8px 10px;border-bottom:1px solid #e2e8f0;}
    td{padding:8px 10px;border-bottom:1px solid #f1f5f9;vertical-align:top;color:#0f172a;}
    .muted{color:#64748b;}
    .small{font-size:11px;}
    .pill{display:inline-block;padding:3px 10px;border-radius:999px;background:#1e40af;color:#fff;font-size:10px;font-weight:700;letter-spacing:.1em;}
    .meta-grid{display:grid;grid-template-columns:96px 1fr;gap:10px 18px;font-size:13px;}
    .meta-grid dt{color:#64748b;font-weight:600;}
    .meta-grid dd{color:#0f172a;font-weight:500;}
    .date-band{display:flex;align-items:baseline;gap:10px;margin:20px 0 8px;padding-bottom:6px;border-bottom:2px solid #1e40af;}
    .date-band .date{font-size:16px;font-weight:800;color:#1e40af;letter-spacing:.04em;}
    .date-band .count{font-size:11px;color:#64748b;}
    .log-row{padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px;page-break-inside:avoid;}
    .log-row .row-meta{display:flex;gap:10px;font-size:11px;color:#64748b;margin-bottom:6px;}
    .log-row .row-meta b{color:#0f172a;}
    .log-row .content{font-size:12px;line-height:1.7;white-space:pre-line;color:#0f172a;}
    .photo-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;}
    .photo-card{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;page-break-inside:avoid;background:#fff;}
    .photo-card .img{width:100%;aspect-ratio:1/1;object-fit:cover;display:block;}
    .photo-card .cap{padding:6px 8px;font-size:10px;color:#475569;display:flex;justify-content:space-between;gap:6px;}
    .photo-card .tag{font-weight:700;color:#1e40af;}
    .cover{display:flex;flex-direction:column;justify-content:space-between;min-height:980px;padding:60px 56px;}
    .cover .brand{font-size:11px;font-weight:700;letter-spacing:.3em;color:#1e40af;}
    .cover .badge{display:inline-block;padding:4px 12px;border-radius:999px;background:#eff6ff;color:#1e40af;font-size:11px;font-weight:700;letter-spacing:.18em;}
    .cover h1{font-size:38px;font-weight:900;letter-spacing:-.02em;line-height:1.15;margin-top:14px;color:#0f172a;}
    .cover .sub{margin-top:10px;font-size:14px;color:#475569;}
    .cover .deco{height:6px;width:80px;background:linear-gradient(90deg,#1e3a8a,#3b82f6);border-radius:3px;margin-top:32px;}
    .cover .info{margin-top:48px;display:grid;grid-template-columns:1fr 1fr;gap:18px 24px;font-size:13px;}
    .cover .info .lbl{font-size:10px;font-weight:700;letter-spacing:.15em;color:#64748b;text-transform:uppercase;}
    .cover .info .val{margin-top:4px;font-weight:600;color:#0f172a;}
    .cover .footer{display:flex;justify-content:space-between;align-items:flex-end;font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:14px;}
    .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px;}
    .summary .item{border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;background:#f8fafc;}
    .summary .lbl{font-size:10px;color:#64748b;letter-spacing:.12em;text-transform:uppercase;font-weight:700;}
    .summary .val{font-size:20px;font-weight:800;margin-top:4px;color:#0f172a;}
    .sign-box{margin-top:36px;border:1px dashed #94a3b8;border-radius:10px;padding:24px;display:grid;grid-template-columns:1fr 1fr;gap:24px;color:#475569;font-size:12px;}
    .sign-box .line{margin-top:46px;border-top:1px solid #cbd5e1;text-align:center;padding-top:6px;font-size:11px;}
  `;

  // --- Build pages ---
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-99999px;top:0;";
  document.body.appendChild(host);

  function makePage(inner: string): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "page";
    wrap.innerHTML = `<style>${baseStyle}</style>${inner}`;
    host.appendChild(wrap);
    return wrap;
  }

  try {
    const pages: HTMLElement[] = [];

    // 1. Cover
    pages.push(
      makePage(`
        <div class="cover">
          <div>
            <div class="brand">${esc(brand)} · FIELD LOG</div>
            <div class="deco"></div>
            <div style="margin-top:32px"><span class="badge">${esc(statusLabel(project.status))}</span></div>
            <h1>${esc(project.name)}</h1>
            <div class="sub">${esc(project.customer_name)} · ${esc(project.address)}</div>
            <div class="info">
              <div><div class="lbl">Customer</div><div class="val">${esc(project.customer_name)}</div></div>
              ${project.customer_phone ? `<div><div class="lbl">Phone</div><div class="val">${esc(project.customer_phone)}</div></div>` : `<div></div>`}
              <div style="grid-column:1/-1"><div class="lbl">Site Address</div><div class="val">${esc(project.address)}</div></div>
              <div><div class="lbl">Start Date</div><div class="val">${esc(project.start_date)}</div></div>
              <div><div class="lbl">Expected End</div><div class="val">${esc(project.expected_end_date || "—")}</div></div>
            </div>
            ${project.scope ? `<div style="margin-top:30px"><div class="lbl" style="font-size:10px;letter-spacing:.15em;color:#64748b;text-transform:uppercase;font-weight:700">Scope</div><p style="margin-top:6px;font-size:13px;line-height:1.7;color:#0f172a;white-space:pre-line">${esc(project.scope)}</p></div>` : ""}
            <div class="summary">
              <div class="item"><div class="lbl">日誌</div><div class="val">${logs.length}</div></div>
              <div class="item"><div class="lbl">照片</div><div class="val">${validPhotos.length}</div></div>
              <div class="item"><div class="lbl">材料</div><div class="val">${materials.length}</div></div>
              <div class="item"><div class="lbl">工時</div><div class="val">${totalHours}<span style="font-size:13px;font-weight:600">h</span></div></div>
            </div>
          </div>
          <div class="footer">
            <span>由「${esc(brand)}」產生 · ${dateStr}</span>
            <span>施工報告書</span>
          </div>
        </div>
      `),
    );

    // 2. Logs page(s) — date grouped
    pages.push(
      makePage(`
        <div class="h-section"><span class="bar"></span>WORK LOGS</div>
        <div class="h-title">施工日誌（共 ${logs.length} 筆 · ${totalHours} 工時）</div>
        <div class="divider"></div>
        ${logsByDate.length === 0
          ? `<p class="muted small">無施工日誌。</p>`
          : logsByDate.map(([d, items]) => `
            <div class="date-band">
              <span class="date">${esc(d)}</span>
              <span class="count">${items.length} 筆 · ${items.reduce((s, l) => s + Number(l.hours || 0), 0)} 工時</span>
            </div>
            ${items.map(l => `
              <div class="log-row">
                <div class="row-meta">
                  <span><b>${l.hours}h</b></span>
                  ${l.workers ? `<span>人員：<b>${esc(l.workers)}</b></span>` : ""}
                </div>
                <div class="content">${esc(l.content)}</div>
                ${l.note ? `<div class="small muted" style="margin-top:6px">備註：${esc(l.note)}</div>` : ""}
              </div>
            `).join("")}
          `).join("")}
      `),
    );

    // 3. Materials page
    if (materials.length > 0) {
      pages.push(
        makePage(`
          <div class="h-section"><span class="bar"></span>MATERIALS</div>
          <div class="h-title">材料明細（共 ${materials.length} 項 · 合計 NT$ ${materialTotal.toLocaleString()}）</div>
          <div class="divider"></div>
          <table>
            <thead>
              <tr>
                <th>品項</th>
                <th style="width:90px">品牌</th>
                <th style="width:70px;text-align:right">數量</th>
                <th style="width:60px">單位</th>
                <th style="width:100px;text-align:right">單價</th>
                <th style="width:110px;text-align:right">金額</th>
              </tr>
            </thead>
            <tbody>
              ${materials.map(m => `
                <tr>
                  <td><b>${esc(m.name)}</b></td>
                  <td class="muted">${esc(m.brand || "—")}</td>
                  <td style="text-align:right" class="tabular">${m.quantity}</td>
                  <td>${esc(m.unit)}</td>
                  <td style="text-align:right">NT$ ${Number(m.unit_price).toLocaleString()}</td>
                  <td style="text-align:right"><b>NT$ ${(Number(m.quantity) * Number(m.unit_price)).toLocaleString()}</b></td>
                </tr>
              `).join("")}
              <tr>
                <td colspan="5" style="text-align:right;font-weight:700">合計</td>
                <td style="text-align:right;font-weight:800;color:#1e40af">NT$ ${materialTotal.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        `),
      );
    }

    // 4. Photos by date — paginate 9 per page (3x3)
    if (photosByDate.length > 0) {
      let isFirstPhotoPage = true;
      for (const [d, items] of photosByDate) {
        // chunk into 9 per page
        for (let i = 0; i < items.length; i += 9) {
          const chunk = items.slice(i, i + 9);
          pages.push(
            makePage(`
              ${isFirstPhotoPage ? `
                <div class="h-section"><span class="bar"></span>SITE PHOTOS</div>
                <div class="h-title">現場照片紀錄</div>
                <div class="divider"></div>
              ` : ""}
              <div class="date-band">
                <span class="date">${esc(d)}</span>
                <span class="count">${items.length} 張${i > 0 ? `（接續 ${i + 1}–${Math.min(i + 9, items.length)}）` : ""}</span>
              </div>
              <div class="photo-grid">
                ${chunk.map(p => `
                  <div class="photo-card">
                    <img class="img" src="${p.dataUrl}" alt="" />
                    <div class="cap">
                      <span class="tag">${p.category === "before" ? "施工前" : p.category === "during" ? "施工中" : "完工後"}</span>
                      <span>${esc((p.taken_at || "").slice(0, 10))}</span>
                    </div>
                    ${p.note ? `<div class="cap muted" style="border-top:1px solid #f1f5f9">${esc(p.note)}</div>` : ""}
                  </div>
                `).join("")}
              </div>
            `),
          );
          isFirstPhotoPage = false;
        }
      }
    }

    // 5. Signature page
    pages.push(
      makePage(`
        <div class="h-section"><span class="bar"></span>VERIFICATION</div>
        <div class="h-title">確認與簽署</div>
        <div class="divider"></div>
        <p class="small muted">本報告由「${esc(brand)}」於 ${dateStr} 系統自動產出，所有施工日誌、材料與照片紀錄皆即時上傳並具時間戳記，供雙方核對。</p>
        <div class="sign-box">
          <div>
            <div style="font-weight:700;color:#0f172a">施工方</div>
            <div class="line">簽章 / 日期</div>
          </div>
          <div>
            <div style="font-weight:700;color:#0f172a">業主</div>
            <div class="line">簽章 / 日期</div>
          </div>
        </div>
      `),
    );

    const fileName = `${project.name.replace(/[^\w\u4e00-\u9fa5-]/g, "_")}_施工報告.pdf`;
    const pdf = await renderToPdf(pages, fileName);

    // Native share
    try {
      const blob = pdf.output("blob");
      const file = new File([blob], fileName, { type: "application/pdf" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: project.name, text: `${project.name} 施工報告` });
      }
    } catch { /* user cancel ok */ }
  } finally {
    document.body.removeChild(host);
  }
}
