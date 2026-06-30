/** 28×24 像素報價鴿 — 依使用者參考圖，手持牛皮紙報價單，透明背景 */
export function QuotePigeonSprite({ size = 64, className = "" }: { size?: number; className?: string }) {
  const rows = [
    "............................",
    "....wwww....................",
    "...wwCCww...................",
    "...wwCCww...................",
    "....wwww....................",
    "............................",
    ".......bbbbbb...............",
    "......bbW#bbbb..............",
    ".....bbbbbbbbbb.............",
    "....bbbbbbbbbbbb............",
    "...bbbbbbbbbbbbbb..PPPP.....",
    "...bbbbbbbbbbbbbb..PTTP.....",
    "...bbbbbbbbbbbbbb..PTTP.....",
    "...bbbbbbbbbbbbbb..PpPP.....",
    "....bbbbbbbbbbbbbbPPP.......",
    "....bbbbKbbbbbbbbbPP........",
    ".....bbbbbbbbbbbbbb.........",
    "......bbbbbbbbbbb...........",
    ".......bbO....bO............",
    ".......bbO....bO............",
    "........gggg................",
    ".......g......g.............",
    "............................",
  ] as const;

  const palette: Record<string, string> = {
    b: "#8b5e3c",
    B: "#6b4423",
    K: "#3a2518",
    O: "#e8833a",
    W: "#ffffff",
    "#": "#1a1a1a",
    C: "#2dd4bf",
    w: "#ffffff",
    P: "#c9a66b",
    p: "#a67c52",
    T: "#6b5344",
    g: "#5a534d",
  };

  const pixels: { x: number; y: number; fill: string }[] = [];
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const fill = palette[ch];
      if (fill) pixels.push({ x, y, fill });
    });
  });

  return (
    <svg
      viewBox="0 0 28 24"
      width={size}
      height={size}
      className={className}
      aria-hidden
      shapeRendering="crispEdges"
    >
      {pixels.map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width={1} height={1} fill={p.fill} />
      ))}
    </svg>
  );
}
