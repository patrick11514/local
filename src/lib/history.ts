import LZString from 'lz-string';

const CHUNK_SIZE = 1000;
const META_KEY = 'history_meta';
const CHUNK_PREFIX = 'history_chunk_';

interface HistoryItem {
	url: string;
	t: number; // timestamp in seconds
}

interface LoadedHistoryItem extends HistoryItem {
	chunkId: number;
}

interface HistoryMeta {
	capacities: number[]; // Index is chunkId, value is REMAINING capacity
}

function getMeta(): HistoryMeta {
	try {
		const stored = localStorage.getItem(META_KEY);
		if (stored) return JSON.parse(stored);
	} catch (e) {
		console.error('Failed to parse history meta', e);
	}
	return { capacities: [] };
}

function saveMeta(meta: HistoryMeta) {
	localStorage.setItem(META_KEY, JSON.stringify(meta));
}

function getChunk(id: number): HistoryItem[] {
	try {
		const stored = localStorage.getItem(`${CHUNK_PREFIX}${id}`);
		if (stored) {
			const decompressed = LZString.decompressFromUTF16(stored);
			return decompressed ? JSON.parse(decompressed) : [];
		}
	} catch {
		// Fallback for non-compressed legacy chunks (during migration/dev)
		try {
			const stored = localStorage.getItem(`${CHUNK_PREFIX}${id}`);
			if (stored) return JSON.parse(stored);
		} catch (e2) {
			console.error(`Failed to parse history chunk ${id}`, e2);
		}
	}
	return [];
}

function saveChunk(id: number, data: HistoryItem[]) {
	const json = JSON.stringify(data);
	const compressed = LZString.compressToUTF16(json);
	localStorage.setItem(`${CHUNK_PREFIX}${id}`, compressed);
}

export const historyStorage = {
	getAll: (): LoadedHistoryItem[] => {
		if (typeof localStorage === 'undefined') return [];
		// Check for migration from old format
		const oldHistory = localStorage.getItem('app_history');
		if (oldHistory) {
			try {
				const parsed = JSON.parse(oldHistory);
				if (Array.isArray(parsed)) {
					// Migrate
					historyStorage.addBulk(parsed);
					localStorage.removeItem('app_history');
				}
			} catch (e) {
				console.error('Migration failed', e);
			}
		}

		const meta = getMeta();
		const all: LoadedHistoryItem[] = [];
		// Using for loop to iterate capacities (which maps to chunks)
		for (let i = 0; i < meta.capacities.length; i++) {
			const chunk = getChunk(i);
			chunk.forEach((item) => {
				all.push({ ...item, chunkId: i });
			});
		}
		// Sort by time descending (newest first)
		return all.sort((a, b) => b.t - a.t);
	},

	add: (url: string) => {
		if (!url) return;
		const now = Math.floor(Date.now() / 1000);

		// Remove duplicates first?
		// User didn't strictly say NO duplicates, but usually history deduplicates or moves to top.
		// For chunked storage, moving to top means delete + add.
		// Checking ALL chunks for existence is expensive.
		// Let's assume we just add, and the UI handles unique display or we accept duplicates with different timestamps.
		// Browser history usually has duplicates but bubbles "typed" URL.
		// For simplicity and performance, we will NOT deduplicate across chunks on write.
		// We will perform a duplicate check in memory if we have the full list loaded,
		// but here we just interact with storage.

		// Actually, to implement "move to top", we should probably delete the old entry if it exists.
		// But finding it requires scanning.
		// Let's implement simpler logic: Just add. deduplication happens in UI/Suggestions.

		const meta = getMeta();
		let chunkId = meta.capacities.findIndex((cap) => cap > 0);

		if (chunkId === -1) {
			chunkId = meta.capacities.length;
			meta.capacities.push(CHUNK_SIZE);
		}

		const chunk = getChunk(chunkId);
		chunk.push({ url, t: now });
		saveChunk(chunkId, chunk);

		meta.capacities[chunkId]--;
		saveMeta(meta);
	},

	addBulk: (urls: string[]) => {
		if (!urls.length) return;
		const now = Math.floor(Date.now() / 1000);
		const meta = getMeta();
		let currentChunkId = meta.capacities.findIndex((cap) => cap > 0);

		if (currentChunkId === -1) {
			currentChunkId = meta.capacities.length;
			meta.capacities.push(CHUNK_SIZE);
		}

		let currentChunk = getChunk(currentChunkId);
		let currentCap = meta.capacities[currentChunkId];

		for (const url of urls) {
			if (currentCap === 0) {
				// Save current
				saveChunk(currentChunkId, currentChunk);
				meta.capacities[currentChunkId] = 0; // Should be 0 already but explicit

				// Move to next available or new
				// Since we are filling sequentially, and we just filled one, we probably need a new one
				// unless there is fragmentation.
				// Scan again?
				const nextId = meta.capacities.findIndex((cap, idx) => idx > currentChunkId && cap > 0); // Search forward
				if (nextId !== -1) {
					currentChunkId = nextId;
				} else {
					currentChunkId = meta.capacities.length;
					meta.capacities.push(CHUNK_SIZE);
				}

				currentChunk = getChunk(currentChunkId);
				currentCap = meta.capacities[currentChunkId];
			}

			currentChunk.push({ url, t: now });
			currentCap--;
		}

		// Save last chunk
		saveChunk(currentChunkId, currentChunk);
		meta.capacities[currentChunkId] = currentCap;
		saveMeta(meta);
	},

	remove: (item: LoadedHistoryItem) => {
		const meta = getMeta();
		if (item.chunkId >= meta.capacities.length) return; // Invalid chunk

		const chunk = getChunk(item.chunkId);
		const newChunk = chunk.filter((i) => i.url !== item.url || i.t !== item.t);

		if (chunk.length === newChunk.length) return; // Nothing removed

		saveChunk(item.chunkId, newChunk);
		meta.capacities[item.chunkId] += chunk.length - newChunk.length;
		saveMeta(meta);
	},

	clear: () => {
		const meta = getMeta();
		for (let i = 0; i < meta.capacities.length; i++) {
			localStorage.removeItem(`${CHUNK_PREFIX}${i}`);
		}
		localStorage.removeItem(META_KEY);
	}
};
