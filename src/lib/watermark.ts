export interface WatermarkInfo {
  projectName: string;
  address?: string;
  worker?: string;
  takenAt: string;
}

const MAX_DIM = 1600;

export async function addWatermarkBlob(
  file: File,
  info: WatermarkInfo,
): Promise<Blob> {
  const dataUrl = await addWatermark(file, info);
  return await (await fetch(dataUrl)).blob();
}

export async function addWatermark(
  file: File,
  info: WatermarkInfo,
): Promise<string> {
  const img = await loadImage(file);
  let { width, height } = img;
  const scale = Math.min(1, MAX_DIM / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);

  const pad = Math.max(16, Math.round(width * 0.018));
  const fontBase = Math.max(18, Math.round(width * 0.028));
  const lineGap = Math.round(fontBase * 1.35);

  const lines = [
    `📋  ${info.projectName}`,
    `🕒  ${info.takenAt}${info.worker ? `   👷  ${info.worker}` : ""}`,
  ];
  if (info.address) lines.push(`📍  ${info.address}`);

  const blockH = pad * 2 + lineGap * lines.length;
  const grad = ctx.createLinearGradient(0, height - blockH * 1.4, 0, height);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.78)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, height - blockH * 1.4, width, blockH * 1.4);

  ctx.fillStyle = "#ffffff";
  ctx.font = `600 ${fontBase}px "Noto Sans TC", system-ui, sans-serif`;
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 4;
  let y = height - blockH + pad;
  for (const line of lines) {
    ctx.fillText(line, pad, y);
    y += lineGap;
  }
  ctx.shadowBlur = 0;

  const tag = "現場紀錄";
  ctx.font = `700 ${Math.round(fontBase * 0.78)}px "Noto Sans TC", system-ui, sans-serif`;
  const tagW = ctx.measureText(tag).width + pad * 1.4;
  const tagH = fontBase * 1.6;
  ctx.fillStyle = "rgba(30, 64, 175, 0.92)";
  roundRect(ctx, width - tagW - pad, pad, tagW, tagH, 8);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText(tag, width - tagW - pad + pad * 0.7, pad + tagH * 0.28);

  return canvas.toDataURL("image/jpeg", 0.85);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export const nowStamp = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
