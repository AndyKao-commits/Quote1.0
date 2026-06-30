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

function isBg(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const avg = (r + g + b) / 3;
  const spread = max - min;
  if (avg < 50) return true;
  if (spread <= 28 && avg >= 182 && avg <= 238) return true;
  return false;
}

function isRed(r, g, b) {
  return r > 145 && g < 135 && b < 135 && r > g + 20 && r > b + 20;
}

// 1) 去背
const seen = new Uint8Array(width * height);
const queue = [];
for (let x = 0; x < width; x++) {
  queue.push(x, 0, x, height - 1);
}
for (let y = 0; y < height; y++) {
  queue.push(0, y, width - 1, y);
}

while (queue.length) {
  const y = queue.pop();
  const x = queue.pop();
  const id = y * width + x;
  if (x < 0 || y < 0 || x >= width || y >= height || seen[id]) continue;
  const [r, g, b, a] = get(x, y);
  if (a === 0 || !isBg(r, g, b)) continue;
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
// 去蒸氣
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const [r, g, b, a] = get(x, y);
    if (a === 0) continue;
    if (r > 232 && g > 232 && b > 232) {
      let nearPaper = false;
      for (let dy = -5; dy <= 5; dy++) {
        for (let dx = -5; dx <= 5; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (paper[ny * width + nx]) nearPaper = true;
        }
      }
      if (nearPaper) set(x, y, 0, 0, 0, 0);
    }
  }
}

// 3) 報價單折角與文字線
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
  const lines = [
    Math.floor(minPY + (maxPY - minPY) * 0.35),
    Math.floor(minPY + (maxPY - minPY) * 0.55),
    Math.floor(minPY + (maxPY - minPY) * 0.75),
  ];
  for (const ly of lines) {
    for (let x = minPX + 2; x < maxPX - 2; x++) {
      if (!paper[ly * width + x]) continue;
      set(x, ly, 107, 83, 52);
    }
  }
}

// 4) 裁切
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

const pad = 3;
minX = Math.max(0, minX - pad);
minY = Math.max(0, minY - pad);
maxX = Math.min(width - 1, maxX + pad);
maxY = Math.min(height - 1, maxY + pad);

const outW = maxX - minX + 1;
const outH = maxY - minY + 1;
const out = new PNG({ width: outW, height: outH });
for (let y = 0; y < outH; y++) {
  for (let x = 0; x < outW; x++) {
    const [r, g, b, a] = get(x + minX, y + minY);
    const i = (outW * y + x) << 2;
    out.data[i] = r;
    out.data[i + 1] = g;
    out.data[i + 2] = b;
    out.data[i + 3] = a;
  }
}

writeFileSync(output, PNG.sync.write(out));

let trans = 0;
let red = 0;
for (let i = 0; i < out.data.length; i += 4) {
  if (out.data[i + 3] < 10) trans++;
  const r = out.data[i];
  const g = out.data[i + 1];
  const b = out.data[i + 2];
  if (out.data[i + 3] > 10 && isRed(r, g, b)) red++;
}
console.log(`Built ${output} ${outW}x${outH} transparent=${trans} remainingRed=${red}`);
