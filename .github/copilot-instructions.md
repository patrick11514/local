Always after completing actions, you should run these two commands:

- `pnpm check` - check types
- `pnpm lint` - check file formatting + eslint errors

If any formatting errors are reported, run: `pnpm format`

When fixing "Unexpected href link without resolve()" errors:

1. If the url is external website, like: "https://example.com", add eslint ignore comment:

   ```ts
   <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
   <a href="https://example.com">External Link</a>
   ```

2. If the url is internal link, import `resolve` and `RouteId` from `$app/paths` and `$app/types`:

   ```ts
   import { resolve } from '$app/paths';
   import type { RouteId } from '$app/types';
   ```

3. Wrap the href value:
   - For variables: `href={resolve(variable as RouteId)}`
   - For static strings: `href={resolve("/some/path")}`

## Project Structure & Documentation

### Overview

A SvelteKit-based dashboard for monitoring Proxmox infrastructure. It visualizes CPU/Memory/Network usage and Disk stats using Shadcn UI components.

### Tech Stack

- **Framework:** SvelteKit (Svelte 5) with Node.js Adapter
- **Styling:** Tailwind CSS + Shadcn-svelte
- **Icons:** Lucide Svelte
- **Data Source:** Proxmox API (PVE)

### Core Files

| File | Purpose |
|Data & Config| |
| `src/lib/config.ts` | Central configuration. Controls monitoring targets (Drives, Node name) and Bookmark links. |
| `src/lib/server/proxmox.ts` | Backend service for communicating with the Proxmox API. Handles auth via Tokens. |
| `.env` | Stores secrets like `PROXMOX_API_TOKEN` and `PROXMOX_API_URL`. |

| API & Routes | |
| `src/routes/api/stats/+server.ts` | Internal API endpoint. Aggregates data from Proxmox (Node status, RRD metrics, Storage status) for the frontend. |
| `src/routes/+page.svelte` | The main dashboard view. Fetches data from `/api/stats` every 10s and renders charts/cards. |

| UI | |
| `src/lib/components/MetricGraph.svelte` | Reusable chart component for CPU/Net/Mem history. |
| `src/lib/components/ui/*` | Reusable Shadcn UI components (Card, Button, Progress, etc). |
| `src/lib/utils.ts` | Utility functions: `cn` (class merging), `formatBytes`, `formatSpeed`, `resolve` (path handling). |

### Data Flow

1. **Frontend (`+page.svelte`)** polls `/api/stats` every 10 seconds.
2. **Internal API (`stats/+server.ts`)** calls methods on the `ProxmoxClient`.
3. **Backend Service (`proxmox.ts`)** fetches raw JSON from the Proxmox API (`/api2/json/...`) using the configured Token.
4. Data is transformed (adding Aliases, formatting) and sent back to the client.

### Common Tasks

- **Adding a new Drive:** Edit `src/lib/config.ts` -> `graphs.drives`. Add `{ id: 'storage-id', alias: 'Display Name' }`.
- **Adding a Bookmark:** Edit `src/lib/config.ts` -> `bookmarks`.
- **Changing Poll Interval:** Edit `src/lib/config.ts` -> `graphs.pollInterval`.
