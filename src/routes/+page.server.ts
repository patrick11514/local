import { getSystemStats } from '$lib/server/proxmox';
import type { Stats } from '../types/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		return {
			stats: await getSystemStats()
		};
	} catch (error) {
		console.error('SSR Error:', error);
		return {
			stats: {
				node: {},
				rrd: [],
				storage: []
			} as Stats,
			error: 'Failed to fetch initial data'
		};
	}
};
