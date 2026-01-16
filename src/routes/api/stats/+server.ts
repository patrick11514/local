import { config } from '$lib/config';
import { proxmox } from '$lib/server/proxmox';
import { json } from '@sveltejs/kit';

export async function GET() {
	try {
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
						error: e.message
					}))
			)
		]);

		return json({
			node: nodeStatus,
			rrd: rrdData,
			storage: storageStats
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		console.error('API Error:', err);
		return json({ error: message }, { status: 500 });
	}
}
