# Proxmox Dashboard

A modern, highly customizable dashboard for monitoring your Proxmox VE infrastructure. Built with SvelteKit, Tailwind CSS, and Shadcn-svelte.

## Features

- **Real-time Monitoring**: Visualizes CPU, Memory, Network traffic, and Disk usage.
- **Interactive Graphs**: Live RRD-based graphs with hover details.
- **Customizable Bookmarks**: Quick access links to your self-hosted services (Home Assistant, Pi-hole, etc.).
- **Responsive Design**: Looks great on desktop and mobile.

## Tech Stack

- **Framework**: SvelteKit (Svelte 5)
- **Styling**: Tailwind CSS, Shadcn-svelte
- **Icons**: Lucide Svelte
- **Backend Integration**: Proxmox API

## Getting Started

### 1. Installation

Clone the repository and install dependencies using [pnpm](https://pnpm.io/):

```bash
pnpm install
```

### 2. Configuration

#### Environment Variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` and add your Proxmox credentials:

```ini
# URL of your Proxmox Node (must include https and port)
PROXMOX_API_URL="https://192.168.1.100:8006"

# API Token (User@Realm!TokenID=UUID)
PROXMOX_API_TOKEN="root@pam!monitoring=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**How to create a Proxmox API Token:**

1. Log in to your Proxmox web interface.
2. Go to **Datacenter** > **Permissions** > **API Tokens**.
3. Click **Add**. Select your user (e.g., `root@pam`) and give the token an ID (e.g., `monitoring`).
4. **Copy the Secret** immediately! You won't see it again.
5. The token format for `.env` is `User@Realm!TokenID=Secret`.

#### Dashboard Config

Create a customizable configuration file:

```bash
cp src/lib/config_example.ts src/lib/config.ts
```

Edit `src/lib/config.ts` to define your specific infrastructure settings:

- **Node Name**: The hostname of your Proxmox node (e.g., `pve`).
- **Drives**: Add the storage IDs you want to monitor (find them in Proxmox > Node > Storage).
- **Bookmarks**: Add links to your other services.

```typescript
export const config = {
	proxmox: {
		apiUrl: 'https://...',
		nodeName: 'pve'
	},
	graphs: {
		pollInterval: 10000,
		drives: [
			{ id: 'local-lvm', alias: 'System' },
			{ id: 'data-ssd', alias: 'Fast Storage' }
		],
		networkInterfaces: ['vmbr0']
	}
	// ... bookmarks ...
};
```

### 3. Running Development Server

Start the app in development mode:

```bash
pnpm dev
# or
pnpm dev --open
```

### 4. Building for Production

To build the application for deployment (using the Node.js adapter):

```bash
pnpm build
```

To run the built application:

```bash
node build
```
