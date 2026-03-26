# Mapa de Diálogos – Vite + React

Interactive map for **Diálogos con el Entorno** (Universidad Panamericana Guadalajara). The app uses **React 18**, **TypeScript**, **Vite 5**, **Tailwind CSS v4** (via `@tailwindcss/vite`), and **Firebase** (Realtime Database + Analytics).

## Styling

Static chrome uses **Tailwind** utilities. Design tokens (brand colors, fonts, radii, shadows) are defined in **`src/index.css`** inside the `@theme` block. The same hex values for the `C` object are kept in **`src/lib/designTokens.ts`** for SVG fills, search result accents, and other non-Tailwind uses—update both when changing brand colors. **Map nodes and breadcrumbs** still use catalog-driven colors (`branch.color`, etc.) inline or on SVG elements.

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** (comes with Node)

## Setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/alexsuarez25/Dialogos-UPGDL.git
cd Dialogos-UPGDL
npm install
```

### 2. Environment variables (Firebase)

Configuration is read from Vite env files. Only variables prefixed with `VITE_` are exposed to the browser.

| Command | Mode | File Vite loads (in order) |
|--------|------|----------------------------|
| `npm run dev` | development | `.env`, `.env.local`, `.env.development`, `.env.development.local` |
| `npm run build` | production | `.env`, `.env.local`, `.env.production`, `.env.production.local` |

**`.env.development`** and **`.env.production`** are **not** tracked in git (see `.gitignore`). After cloning, create them locally:

1. Copy **`.env.example`** to **`.env.development`** (for `npm run dev`) and/or **`.env.production`** (for local `npm run build` / `npm run preview`).
2. Fill in every `VITE_FIREBASE_*` value from the Firebase console (**Project settings → Your apps → SDK setup**).

Optional overrides (also gitignored when named `*.local`):

- **`.env.local`** — applies to all modes.
- **`.env.development.local`** / **`.env.production.local`** — overrides for a single mode.

If any required variable is missing, the app throws a clear error at startup when Firebase initializes (`src/lib/firebase/client.ts`).

### 3. Run the app

**Development** (hot reload, uses `.env.development`):

```bash
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

**Production build** (uses `.env.production`):

```bash
npm run build
```

**Preview the production build locally**:

```bash
npm run preview
```

## Project layout (short)

- **`src/main.jsx`** — entry; mounts React.
- **`src/components/layout/App.tsx`** — thin shell; loads the main feature screen.
- **`src/components/features/dialogos/`** — map UI (`Dashboard`, panels, popovers, etc.).
- **`src/lib/`** — shared logic (`mapStatic`, search, geometry, …).
- **`src/lib/firebase/`** — Firebase app init (`client.ts`) and Realtime Database helpers (`contactosRealtime`, `tagMapRealtime`, `notasNietoRealtime`, `mapCustomNodesRealtime` for extra micro-nodes under existing catalog children, synced from **⚙ Nodos**).
- **`src/types/`** — shared TypeScript types.

Firebase **client** config is public by design (it ships in the bundle). Protect data with **Firebase Realtime Database rules** (and any other Firebase security) in the console.

**Realtime paths used by this app:** `contactos`, `tag_map`, `notas_nietos`, **`map_app_state`** (notes, contacts snapshot, deleted node names, user-only tags, hidden main contacts — replaces former browser `window.storage` keys), and **`map_catalog`** (single root: built-in tree fields `main`, `projects`, `cinov_subs`, `aliados_subs`, `invest_subs`, plus **`custom_nietos`** for micro-nodes attached to an existing child, created in **⚙ Nodos**). The dashboard listens to the whole object; the first load runs **`ensureMapCatalogSeeded`**, which can merge legacy data from `map_catalog/built_in_v1` and `custom_map_nodes/*` into `map_catalog` if needed. Allow read/write on `map_catalog` and `map_app_state` for roles that should edit the map (or tighten as needed).

## Deploy (e.g. Netlify)

- **Build command:** `npm run build`
- **Publish directory:** `dist`

### Production env vars on Netlify

Vite reads `import.meta.env` **at build time**, so Firebase values must be present when Netlify runs `npm run build`. They are not read from the browser at runtime.

1. In the Netlify dashboard: **Site configuration** → **Environment variables** (or **Build & deploy** → **Environment** → **Environment variables**).
2. Add each key **exactly** as below (names must start with `VITE_`). Use the same values as **`.env.production`** / your production Firebase app (**Project settings → Your apps → SDK setup**).
3. Set **Deploy context** to **Production** (or **All** if this site is only used for production).

| Variable | Notes |
|----------|--------|
| `VITE_FIREBASE_API_KEY` | Required |
| `VITE_FIREBASE_AUTH_DOMAIN` | Required |
| `VITE_FIREBASE_PROJECT_ID` | Required |
| `VITE_FIREBASE_DATABASE_URL` | Required |
| `VITE_FIREBASE_STORAGE_BUCKET` | Required |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Required |
| `VITE_FIREBASE_APP_ID` | Required |
| `VITE_FIREBASE_MEASUREMENT_ID` | Optional; omit only if you do not use Analytics |

4. Save, then trigger a new deploy (**Deploys** → **Trigger deploy**). Use **Clear cache and deploy site** if a previous build cached the wrong config.

On Netlify, define production Firebase in **Environment variables** (see above); do not rely on a committed `.env.production` in the repo. For a **local** production build, keep **`.env.production`** on your machine only (gitignored).

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve `dist/` locally |
