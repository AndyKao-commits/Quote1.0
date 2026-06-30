/** 32×28 像素報價鴿，透明背景 SVG */
export function QuotePigeonSprite({ size = 64, className = "" }: { size?: number; className?: string }) {
  const rows = [
    "................................",
    "....wwwwww......................",
    "...wwCCwwww.....................",
    "...wwCCwwww.....................",
    "....wwwwww......................",
    "................................",
    "...........wwwwww...............",
    "..........wwGGGGww..............",
    ".........wBBO#BBBww.............",
    "........wBBBBBBBBBwW............",
    ".......wBBbbbbbBBBWWw...........",
    "......wBbbbbbbbbWWWWw...........",
    ".....wBbbbbbbbbGGGGw............",
    "....wBBbbbbbbbWWWWw.............",
    "....wBBBbbbbBBWWw...............",
    "...wBBBBBBBBBBw.................",
    "...wBBBKKBBBBw..................",
    "..wBBBBBBBBBw...................",
    "..wBBBbbbBBw....................",
    "...wBBbbbBw.....................",
    "....wBBBww......................",
    ".....wOwO.......................",
    ".....wOwO.......................",
    "......gg........................",
    ".....g..g.......................",
    "....g....g......................",
    "................................",
    "................................",
  ] as const;

  const palette: Record<string, string> = {
    B: "#5c3d2e",
    b: "#7a5238",
    K: "#3a2518",
    O: "#e8833a",
    W: "#ffffff",
    w: "#ffffff",
    G: "#b0a8a0",
    g: "#4a4540",
    C: "#22d3ee",
    "#": "#1a1a1a",
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
      viewBox="0 0 32 28"
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
