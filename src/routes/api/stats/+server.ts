import { getSystemStats } from '$lib/server/proxmox';
import { json } from '@sveltejs/kit';

export async function GET() {
	try {
		const stats = await getSystemStats();
		return json(stats);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		console.error('API Error:', err);
		return json({ error: message }, { status: 500 });
	}
}
