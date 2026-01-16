import { env } from '$env/dynamic/private';
import { config } from '$lib/config';

// Allow self-signed certificates for local Proxmox instances
// In production, you should import the CA or use a real certificate
if (process.env.NODE_ENV === 'development') {
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
			const [id, secret] = this.token.split('=');
			console.log(`Using Proxmox Token ID: ${id}=${secret.substring(0, 4)}***`);
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
