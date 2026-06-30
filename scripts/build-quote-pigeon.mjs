import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";

const input = process.argv[2];
const output = process.argv[3];

const src = PNG.sync.read(readFileSync(input));
const { width, height, data } = src;

function get(x, y) {
  const i = (width * y + x) << 2;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
}

function set(x, y, r, g, b, a = 255) {
  const i = (width * y + x) << 2;
  data[i] = r;
  data[i + 1] = g;
  data[i + 2] = b;
  data[i + 3] = a;
}

function isRed(r, g, b) {
  return r > 145 && g < 135 && b < 135 && r > g + 20 && r > b + 20;
}

function isCyan(r, g, b) {
  return g > 145 && b > 130 && r < 175;
}

function isEdgeBg(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const avg = (r + g + b) / 3;
  const spread = max - min;
  if (avg < 50) return true;
  if (spread <= 28 && avg >= 182 && avg <= 238) return true;
  return false;
}

// 1) 去掉外框與灰底卡片
const seen = new Uint8Array(width * height);
const queue = [];
for (let x = 0; x < width; x++) queue.push(x, 0, x, height - 1);
for (let y = 0; y < height; y++) queue.push(0, y, width - 1, y);

while (queue.length) {
  const y = queue.pop();
  const x = queue.pop();
  const id = y * width + x;
  if (x < 0 || y < 0 || x >= width || y >= height || seen[id]) continue;
  const [r, g, b, a] = get(x, y);
  if (a === 0 || !isEdgeBg(r, g, b)) continue;
  seen[id] = 1;
  set(x, y, 0, 0, 0, 0);
  queue.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
}

// 2) 馬克杯 → 牛皮紙
const paper = new Uint8Array(width * height);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const [r, g, b, a] = get(x, y);
    if (a === 0) continue;
    if (isRed(r, g, b)) paper[y * width + x] = 1;
  }
}
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (!paper[y * width + x]) continue;
    set(x, y, 201, 166, 107);
  }
}

let minPX = width;
let minPY = height;
let maxPX = 0;
let maxPY = 0;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (!paper[y * width + x]) continue;
    minPX = Math.min(minPX, x);
    minPY = Math.min(minPY, y);
    maxPX = Math.max(maxPX, x);
    maxPY = Math.max(maxPY, y);
  }
}
if (maxPX > minPX) {
  set(maxPX, minPY, 166, 124, 74);
  for (const t of [0.32, 0.52, 0.72]) {
    const ly = Math.floor(minPY + (maxPY - minPY) * t);
    for (let x = minPX + 2; x < maxPX - 2; x++) {
      if (!paper[ly * width + x]) continue;
      set(x, ly, 107, 83, 52);
    }
  }
}

// 3) 保留對話框白底 + 眼睛白底；其餘孤立白點（蒸氣）刪除
const keep = new Uint8Array(width * height);
const wq = [];

function growFrom(x, y, maxSteps, allow) {
  const start = y * width + x;
  if (keep[start]) return;
  wq.length = 0;
  wq.push(x, y, 0);
  keep[start] = 1;

  while (wq.length) {
    const steps = wq.pop();
    const py = wq.pop();
    const px = wq.pop();
    if (steps >= maxSteps) continue;
    for (const [nx, ny] of [
      [px + 1, py],
      [px - 1, py],
      [px, py + 1],
      [px, py - 1],
    ]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const id = ny * width + nx;
      if (keep[id]) continue;
      const [r, g, b, a] = get(nx, ny);
      if (a === 0 || !allow(r, g, b)) continue;
      keep[id] = 1;
      wq.push(nx, ny, steps + 1);
    }
  }
}

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const [r, g, b, a] = get(x, y);
    if (a === 0) continue;
    if (isCyan(r, g, b)) growFrom(x, y, 24, (rr, gg, bb) => isCyan(rr, gg, bb) || (rr > 215 && gg > 215 && bb > 215));
    if (r < 45 && g < 45 && b < 45) growFrom(x, y, 8, (rr, gg, bb) => (rr < 45 && gg < 45 && bb < 45) || (rr > 215 && gg > 215 && bb > 215));
  }
}

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const [r, g, b, a] = get(x, y);
    if (a === 0) continue;
    if (r > 232 && g > 232 && b > 232 && !keep[y * width + x]) set(x, y, 0, 0, 0, 0);
  }
}

// 4) 刪除卡片內殘留大塊白/灰島（未連到角色）
for (let pass = 0; pass < 2; pass++) {
  const island = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = get(x, y);
      if (a === 0) continue;
      const light = r > 210 && g > 210 && b > 210;
      const grey = isEdgeBg(r, g, b);
      if (!light && !grey) continue;
      if (keep[y * width + x]) continue;

      const q = [x, y];
      const cells = [];
      let touchesChar = false;
      const mark = new Set();
      while (q.length) {
        const cy = q.pop();
        const cx = q.pop();
        const id = cy * width + cx;
        if (mark.has(id)) continue;
        mark.add(id);
        const [cr, cg, cb, ca] = get(cx, cy);
        if (ca === 0) continue;
        const cl = cr > 210 && cg > 210 && cb > 210;
        const cgrey = isEdgeBg(cr, cg, cb);
        if (!cl && !cgrey) {
          touchesChar = true;
          continue;
        }
        if (keep[id]) {
          touchesChar = true;
          continue;
        }
        cells.push(cx, cy);
        q.push(cx + 1, cy, cx - 1, cy, cx, cy + 1, cx, cy - 1);
      }
      if (!touchesChar) {
        for (let i = 0; i < cells.length; i += 2) set(cells[i], cells[i + 1], 0, 0, 0, 0);
      }
    }
  }
}

// 5) 裁切 + 縮放
let minX = width;
let minY = height;
let maxX = 0;
let maxY = 0;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (get(x, y)[3] === 0) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
}

const pad = 2;
minX = Math.max(0, minX - pad);
minY = Math.max(0, minY - pad);
maxX = Math.min(width - 1, maxX + pad);
maxY = Math.min(height - 1, maxY + pad);
const cropW = maxX - minX + 1;
const cropH = maxY - minY + 1;

const targetW = 64;
const targetH = Math.max(1, Math.round((cropH / cropW) * targetW));
const out = new PNG({ width: targetW, height: targetH });

for (let y = 0; y < targetH; y++) {
  for (let x = 0; x < targetW; x++) {
    const sx = minX + Math.floor((x + 0.5) * (cropW / targetW));
    const sy = minY + Math.floor((y + 0.5) * (cropH / targetH));
    const [r, g, b, a] = get(sx, sy);
    const i = (targetW * y + x) << 2;
    out.data[i] = r;
    out.data[i + 1] = g;
    out.data[i + 2] = b;
    out.data[i + 3] = a;
  }
}

writeFileSync(output, PNG.sync.write(out));

let trans = 0;
let white = 0;
for (let i = 0; i < out.data.length; i += 4) {
  if (out.data[i + 3] < 10) trans++;
  if (out.data[i + 3] > 10 && out.data[i] > 215 && out.data[i + 1] > 215 && out.data[i + 2] > 215) white++;
}
console.log(`Built ${output} ${targetW}x${targetH} transparent=${trans} white=${white}`);
