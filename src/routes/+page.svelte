<script lang="ts">
	import MetricGraph from '$lib/components/MetricGraph.svelte';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Progress } from '$lib/components/ui/progress';
	import { config } from '$lib/config';
	import * as Icons from 'lucide-svelte';
	import { Search } from 'lucide-svelte';
	import type { ComponentType } from 'svelte';
	import { onDestroy, onMount } from 'svelte';

	let stats = $state<{
		rrd: any[];
		storage: any[];
		node: any;
	}>({
		rrd: [],
		storage: [],
		node: {}
	});

	let interval: ReturnType<typeof setInterval>;

	const fetchData = async () => {
		try {
			const res = await fetch('/api/stats');
			const data = await res.json();
			if (data.error) throw new Error(data.error);
			stats = data;
		} catch (e) {
			console.error(e);
		}
	};

	onMount(() => {
		fetchData();
		interval = setInterval(fetchData, config.graphs.pollInterval);
	});

	onDestroy(() => {
		clearInterval(interval);
	});

	// Transform RRD data for graphs
	// Proxmox RRD data time is in seconds.
	function formatData(key: string, transform = (v: number) => v) {
		return (
			stats.rrd
				?.map((d: any) => ({
					x: d.time * 1000,
					y: transform(d[key] || 0)
				}))
				.filter((d: any) => !isNaN(d.y)) || []
		);
	}

	let cpuData = $derived(formatData('cpu', (v) => v * 100)); // 0-1 to %
	let memData = $derived(formatData('mem', (v) => v / 1024 / 1024 / 1024)); // Bytes to GB
	let netInData = $derived(formatData('netin', (v) => v / 1024 / 1024)); // Bytes to MB
	let netOutData = $derived(formatData('netout', (v) => v / 1024 / 1024)); // Bytes to MB

	let currentCpu = $derived(((stats.node?.cpu || 0) * 100).toFixed(1) + '%');
	let currentMem = $derived(
		((stats.node?.memory?.used || 0) / 1024 / 1024 / 1024).toFixed(1) + ' GB'
	);

	// Dynamically retrieve icon component
	function getIcon(name: string): ComponentType | null {
		// @ts-ignore - Index signature for Icons
		return ((Icons as any)[name] as ComponentType) || Icons.Link;
	}
</script>

<div
	class="flex min-h-screen w-full flex-col items-center gap-12 bg-background p-4 font-sans text-foreground md:p-8"
>
	<!-- Top Section: System Dashboard -->
	<div
		class="grid w-full max-w-7xl grid-cols-1 gap-4 duration-700 animate-in fade-in slide-in-from-bottom-4 md:grid-cols-2 lg:grid-cols-4"
	>
		<MetricGraph
			title="CPU Usage"
			value={currentCpu}
			data={cpuData}
			color="hsl(var(--primary))"
			id="cpu"
		/>
		<MetricGraph
			title="Memory Usage"
			value={currentMem}
			data={memData}
			color="hsl(var(--destructive))"
			id="mem"
		/>
		<MetricGraph
			title="Network In (MB/s)"
			value={((stats.node?.netin || 0) / 1024 / 1024).toFixed(1)}
			data={netInData}
			color="hsl(var(--accent-foreground))"
			id="netin"
		/>
		<MetricGraph
			title="Network Out (MB/s)"
			value={((stats.node?.netout || 0) / 1024 / 1024).toFixed(1)}
			data={netOutData}
			color="hsl(var(--secondary-foreground))"
			id="netout"
		/>
	</div>

	<!-- Disk Usage Section -->
	<div
		class="grid w-full max-w-7xl grid-cols-1 gap-4 delay-100 duration-700 animate-in fade-in slide-in-from-bottom-8 md:grid-cols-3"
	>
		{#each stats.storage as drive}
			{@const percent = drive.total ? Math.round((drive.used / drive.total) * 100) : 0}
			<Card class="border-input bg-card/50">
				<CardHeader class="pb-2">
					<CardTitle class="text-sm font-medium text-muted-foreground uppercase"
						>{drive.alias || drive.storage}</CardTitle
					>
				</CardHeader>
				<CardContent>
					<div class="mb-2 flex items-end justify-between">
						<span class="text-2xl font-bold">{percent}%</span>
						<span class="text-xs text-muted-foreground"
							>{(drive.used / 1024 / 1024 / 1024).toFixed(0)} GB / {(
								drive.total /
								1024 /
								1024 /
								1024
							).toFixed(0)} GB</span
						>
					</div>
					<Progress value={percent} class="h-2" />
				</CardContent>
			</Card>
		{/each}
	</div>

	<!-- Middle Section: Search & Navigation -->
	<div
		class="mt-10 flex w-full max-w-3xl flex-col items-center gap-10 delay-200 duration-700 animate-in zoom-in-95"
	>
		<!-- Google Search -->
		<form
			action="https://google.com/search"
			method="GET"
			class="group relative w-full transform transition-all hover:scale-[1.01]"
		>
			<Search
				class="absolute top-1/2 left-6 h-6 w-6 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
			/>
			<Input
				name="q"
				class="h-16 rounded-full border-input bg-card/80 pl-16 text-xl shadow-lg ring-offset-background backdrop-blur-sm focus-visible:ring-primary/50"
				placeholder="Search Google..."
			/>
		</form>

		<!-- Bookmarks Grid -->
		<div class="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
			{#each config.bookmarks as bookmark}
				<a href={bookmark.url} target="_blank" rel="noreferrer" class="group">
					<Card
						class="flex h-32 cursor-pointer flex-col items-center justify-center gap-3 border-none bg-card/40 backdrop-blur-sm transition-all duration-300 group-hover:ring-1 group-hover:ring-primary/20 hover:-translate-y-1 hover:bg-card hover:shadow-xl"
					>
						{@const Icon = getIcon(bookmark.icon)}
						<Icon
							class="h-8 w-8 text-muted-foreground transition-colors group-hover:text-primary"
						/>
						<span
							class="px-2 text-center text-sm font-medium transition-colors group-hover:text-primary"
							>{bookmark.title}</span
						>
					</Card>
				</a>
			{/each}
		</div>
	</div>
</div>
