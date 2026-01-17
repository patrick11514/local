export interface RRDData {
	time: number;
	[key: string]: number;
}

export interface StorageData {
	storage: string;
	alias?: string;
	total: number;
	used: number;
}

export interface NodeData {
	cpu?: number;
	memory?: {
		used: number;
		total: number;
	};
	netin?: number;
	netout?: number;
}

export interface Stats {
	rrd: RRDData[];
	storage: StorageData[];
	node: NodeData;
}
