export interface Bookmark {
	title: string;
	url: string;
	icon: string; // Lucide icon name or image URL
	description?: string;
	color?: string; // Hex or Tailwind class
}

export interface ProxmoxConfig {
	apiUrl: string;
	nodeName: string;
}

export interface DriveConfig {
	id: string;
	alias: string;
}

export interface GraphConfig {
	pollInterval: number; // in milliseconds
	drives: DriveConfig[]; // storage names to monitor (e.g. "local-lvm")
	networkInterfaces: string[];
}

export const config = {
	proxmox: {
		/**
		 * The base URL of your Proxmox instance.
		 * Overridable via env var PROXMOX_API_URL
		 */
		apiUrl: 'https://192.168.1.100:8006',
		nodeName: 'pve'
	},
	graphs: {
		pollInterval: 10_000,
		drives: [
			{ id: 'local', alias: 'ISO Storage' },
			{ id: 'local-data', alias: 'SSD' }
		],
		networkInterfaces: ['vmbr0']
	},
	bookmarks: [
		{
			title: 'Proxmox',
			url: 'http://proxmox.local',
			icon: 'Server',
			description: 'Manage virtual machines and containers'
		},
		{
			title: 'Nginx Proxy Manager',
			url: 'http://npm.local',
			icon: 'Shield',
			description: 'Manage reverse proxy hosts'
		},
		{
			title: 'Pi-hole',
			url: 'http://pihole.local',
			icon: 'Activity',
			description: 'Network-wide ad blocking'
		}
	] as Bookmark[]
};
