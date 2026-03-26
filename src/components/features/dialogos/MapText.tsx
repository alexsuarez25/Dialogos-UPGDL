import type { ReactNode } from "react";

/** SVG map labels (allowed inside map canvas) */
export function MapText({
  text,
  x,
  y,
  size = 12,
  fill = "#333",
  bold = true,
  lh = null,
}: {
  text: string;
  x: number;
  y: number;
  size?: number;
  fill?: string;
  bold?: boolean;
  lh?: number | null;
}): ReactNode {
  const ls = text.split("\n");
  const lH = lh ?? size * 1.35;
  const y0 = y - ((ls.length - 1) * lH) / 2;
  return ls.map((l, i) => (
    <text
      key={i}
      x={x}
      y={y0 + i * lH}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={size}
      fill={fill}
      fontWeight={bold ? 900 : 700}
      fontFamily="'Cormorant Garamond','Georgia',serif"
      style={{ pointerEvents: "none", letterSpacing: "0.4px" }}
    >
      {l}
    </text>
  ));
}
