/**
 * Brand surface + text colors. Keep hex values in sync with `src/index.css` `@theme`.
 */
export const C = {
  gold: "#C4A55A",
  goldLt: "#D4BA78",
  goldDk: "#A08040",
  blue: "#002D72",
  blueLt: "#1a4a8a",
  red: "#8C2633",
  green: "#00695C",
  greenLt: "#1a8a7a",
  black: "#1A1A1A",
  white: "#FFFFFF",
  bg: "#F5F2EB",
  panelBg: "#FAFAF7",
  pulseRed: "#CC3333",
  textDk: "#2A2420",
  textMd: "#5A5040",
  textLt: "#8A8070",
} as const;

export type PaletteColors = typeof C;
