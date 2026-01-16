# Development Progress - Local Intranet Landing Page

## Phase 1: Project Initialization & Configuration

- [x] **Setup TailwindCSS & Shadcn-Svelte**
  - [x] Initialize TailwindCSS if not fully configured.
  - [x] Initialize `shadcn-svelte` (`npx shadcn-svelte@latest init`).
  - [x] Configure the global theme to "Dark" by default (Black background).
- [x] **Create Configuration Schema**
  - [x] Create `src/lib/config.ts` (or `.json`) to define:
    - [x] Proxmox connection details (API URL, Node name).
    - [x] Graph settings (poll interval, specific drives to monitor).
    - [x] Bookmarks list (Title, URL, Icon/Logo URL, Color/Variant).

## Phase 2: Backend Integration (Proxmox API)

- [x] **Proxmox Client Setup**
  - [x] Create a server-side utility (`src/lib/server/proxmox.ts`) to handle API requests.
  - [x] Implement authentication (API Token or User/Pass).
  - [x] Create a SvelteKit API route (`routes/api/stats/+server.ts`) to proxy requests to Proxmox (avoids CORS issues).
- [x] **Data Fetching Implementation**
  - [x] Fetch Node Status (CPU, Memory, Uptime).
  - [x] Fetch Network Interface statistics (In/Out traffic).
  - [x] Fetch Storage/Disk usage (Filter for NVMe, SATA SSD, HDD based on config).

## Phase 3: UI Components (Shadcn-Svelte)

- [x] **Install Core Components**
  - [x] Card (`pnpm dlx shadcn-svelte@latest add card`)
  - [x] Button (`pnpm dlx shadcn-svelte@latest add button`)
  - [x] Input (`pnpm dlx shadcn-svelte@latest add input`)
  - [x] Separator/Badge (optional for styling).
- [x] **Chart Library Integration**
  - [x] Select a charting library compatible with `shadcn-svelte` (e.g., `layerchart`, `unovis`, or `chart.js` with wrappers).
  - [x] Create reusable `MetricGraph.svelte` component.
    - [x] Support Area charts (CPU/Mem/Net) and Bar/Pie charts (Disk Usage).
    - [x] Style them to match the "Black/Dark" theme with neon accents.

## Phase 4: Layout & Features

- [x] **Top Section: System Dashboard**
  - [x] implement a responsive grid layout.
  - [x] Wire up the API data to the `MetricGraph` components.
  - [x] Add auto-refresh logic (polling).
- [x] **Middle Section: Search & Navigation**
  - [x] **Google Search Bar:** Create a clean, centered search input that redirects to `google.com/search?q=...`.
  - [x] **Bookmark Cards:**
    - [x] Iterate through the config file.
    - [x] Render small, clickable cards with logos for intranet services (ProxMox, NPM, Pi-hole, etc.).
    - [x] Implement hover effects for a "modern" feel.

## Phase 5: Polish & Deployment

- [x] **Theming refinement**
  - [x] Ensure the "Black" theme is consistent (background `#000000` or very dark gray `#09090b`).
  - [x] Verify accessibility and contrast.
- [x] **Testing**
  - [x] Test API failure states (offline proxmox).
  - [x] Test layout on mobile vs desktop.
- [x] **Final Build**
  - [x] `pnpm build` check.
