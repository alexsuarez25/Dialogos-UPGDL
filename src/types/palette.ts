/**
 * Brand color key shape used across the app. Hex literals are exported as `C` from
 * `src/lib/designTokens.ts`. Tailwind utilities use the same values via `src/index.css`
 * `@theme` — keep `designTokens.ts`, `@theme`, and any SVG/catalog-driven colors consistent.
 */
export type { PaletteColors as Palette } from "../lib/designTokens";
