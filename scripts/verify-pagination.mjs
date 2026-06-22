const BUDGET_DETAIL = 31;
const BUDGET_DETAIL_CONT = 33;
const FOOTER = 1;

function weight(l) {
  let w = 1;
  w += Math.floor(l.name.length / 28);
  if (l.note) w += Math.floor(l.note.length / 40);
  return Math.max(1, w);
}

function paginate(lines) {
  if (!lines.length) return [];
  const pages = [];
  let idx = 0;
  while (idx < lines.length) {
    const budget = pages.length === 0 ? BUDGET_DETAIL : BUDGET_DETAIL_CONT;
    let take = 0;
    let used = 0;
    while (idx + take < lines.length) {
      const w = weight(lines[idx + take]);
      const after = lines.length - idx - take - 1;
      const maxUsed = after === 0 ? budget - FOOTER : budget;
      if (take > 0 && used + w > maxUsed) break;
      if (take === 0 && w > budget) {
        take = 1;
        used = w;
        break;
      }
      if (used + w > budget) break;
      used += w;
      take++;
    }
    if (take === 0) take = 1;
    pages.push(take);
    idx += take;
  }
  return pages;
}

const groups = [
  "木作工程",
  "油漆工程",
  "水電工程",
  "燈具工程",
  "系統工程",
  "玻璃工程",
  "其他工程",
  "窗簾工程",
  "監管費",
];

for (let n = 4; n <= 8; n++) {
  const lines = [];
  for (const g of groups) {
    lines.push({ line_type: "group", name: g, note: "" });
    for (let i = 1; i <= n; i++) {
      lines.push({ line_type: "item", name: `${g}細項${i}`, note: "" });
    }
  }
  const p = paginate(lines);
  console.log(
    `items/group=${n} lines=${lines.length} detail=${p.length} [${p.join("+")}] total=${1 + p.length}`,
  );
}
