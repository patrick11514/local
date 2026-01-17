import { env } from '$env/dynamic/private';
import { config } from '$lib/config';
import type { Stats } from '../../types/types';

// 1. Check if it's set in the process (e.g. from CLI) or in .env file via SvelteKit
const allowInsecure =
	process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0' || env.NODE_TLS_REJECT_UNAUTHORIZED === '0';

// 2. Explicitly apply it to the process for the Node.js TLS stack to pick it up
if (allowInsecure) {
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export class ProxmoxClient {
	private baseUrl: string;
	private token: string;
	private node: string;

	constructor() {
		this.baseUrl = env.PROXMOX_API_URL || config.proxmox.apiUrl;
		// Token format: USER@REALM!TOKENID=UUID
		this.token = env.PROXMOX_API_TOKEN || '';
		this.node = config.proxmox.nodeName;

		if (!this.token) {
			console.warn('⚠️ PROXMOX_API_TOKEN is not set in environment variables!');
		} else if (!this.token.includes('!') || !this.token.includes('=')) {
			console.warn(
				'⚠️ PROXMOX_API_TOKEN might be invalid. Expected format: USER@REALM!TOKENID=UUID (e.g. root@pam!monitoring=...) '
			);
		} else {
			// Debug log to confirm token is loaded (masking the secret)
			// const [id, secret] = this.token.split('=');
			// console.log(`Using Proxmox Token ID: ${id}=${secret.substring(0, 4)}***`);
		}
	}

	private async request(endpoint: string) {
		const url = `${this.baseUrl}/api2/json/${endpoint}`;
		try {
			const res = await fetch(url, {
				headers: {
					Authorization: `PVEAPIToken=${this.token}`,
					Accept: 'application/json'
				}
			});

			if (!res.ok) {
				const txt = await res.text();
				console.error(`Proxmox API Error [${res.status}]: ${txt}`);
				throw new Error(`Proxmox API Error: ${res.status} ${res.statusText}`);
			}

			const data = await res.json();
			return data.data;
		} catch (error) {
			console.error('Failed to fetch from Proxmox:', error);
			throw error;
		}
	}

	async getNodeStatus() {
		// Returns CPU, Memory, Uptime, Load etc.
		return this.request(`nodes/${this.node}/status`);
	}

	async getStorageStatus(storage: string) {
		// Returns disk usage for specific storage
		return this.request(`nodes/${this.node}/storage/${storage}/status`);
	}

	async getResources() {
		// Returns list of all VMs, Containers, Storages, etc.
		return this.request('cluster/resources');
	}

	async getNetworkStats() {
		// For simple stats, node status has some, but typically we want rrddata for graphs
		// Or we can parse /proc/net/dev if we had shell access, but we are using API.
		// nodes/{node}/rrddata?timeframe=hour
		return this.request(`nodes/${this.node}/rrddata?timeframe=hour&cf=AVERAGE`);
	}
}

export const proxmox = new ProxmoxClient();

export async function getSystemStats() {
	const [nodeStatus, rrdData, ...storageStats] = await Promise.all([
		proxmox.getNodeStatus(),
		proxmox.getNetworkStats(),
		...config.graphs.drives.map((drive) =>
			proxmox
				.getStorageStatus(drive.id)
				.then((data) => ({ ...data, alias: drive.alias }))
				.catch((e) => ({
					storage: drive.id,
					alias: drive.alias,
					total: 0,
					used: 0,
					error: e instanceof Error ? e.message : String(e)
				}))
		)
	]);

	return {
		node: nodeStatus,
		rrd: rrdData,
		storage: storageStats
	} as Stats;
}
