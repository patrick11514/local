<script lang="ts">
	import MetricGraph from '$lib/components/MetricGraph.svelte';
	import VirtualList from '$lib/components/VirtualList.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Progress } from '$lib/components/ui/progress';
	import { config } from '$lib/config';
	import { historyStorage } from '$lib/history';
	import { formatBytes, formatSpeed } from '$lib/utils';
	import isUrl from 'is-url';
	import * as Icons from 'lucide-svelte';
	import { History as HistoryIcon, Import, Search, Trash2, X } from 'lucide-svelte';
	import type { ComponentType } from 'svelte';
	import { onMount, tick } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let stats = $derived(data.stats);
	let searchQuery = $state('');
	let history = $state<{ url: string; t: number; chunkId: number }[]>([]);
	let showHistoryModal = $state(false);
	let historySearchQuery = $state('');

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

	function loadHistory() {
		history = historyStorage.getAll();
	}

	onMount(() => {
		const interval = setInterval(fetchData, config.graphs.pollInterval);

		loadHistory();

		return () => {
			clearInterval(interval);
		};
	});

	function saveHistory(item: string) {
		if (!item) return;
		historyStorage.add(item);
		loadHistory(); // Reload to update UI and suggestion list
	}

	function removeHistoryItem(item: (typeof history)[0]) {
		historyStorage.remove(item);
		loadHistory();
	}

	function clearHistory() {
		if (confirm('Are you sure you want to clear your search history?')) {
			historyStorage.clear();
			loadHistory();
		}
	}

	function importHistory() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'application/json';
		input.onchange = (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;
			const reader = new FileReader();
			reader.onload = (e) => {
				try {
					const content = e.target?.result as string;
					const items: unknown = JSON.parse(content);
					if (Array.isArray(items)) {
						const newItems = items
							.map((item: unknown) => {
								if (typeof item === 'string') return item;
								// Support object format with url property
								if (
									typeof item === 'object' &&
									item !== null &&
									'url' in item &&
									typeof (item as { url: unknown }).url === 'string'
								) {
									return (item as { url: string }).url;
								}
								return null;
							})
							.filter((item): item is string => typeof item === 'string' && item.length > 0);

						if (newItems.length === 0 && items.length > 0) {
							alert('Invalid format: Expected array of strings or objects with "url" property');
							return;
						}

						historyStorage.addBulk(newItems);
						loadHistory();
						alert(`Imported ${newItems.length} items`);
					} else {
						alert('Invalid format: Expected an array');
					}
				} catch (e) {
					console.error(e);
					alert('Failed to parse JSON');
				}
			};
			reader.readAsText(file);
		};
		input.click();
	}

	function isDomain(str: string) {
		// Basic loose domain check: something.something
		// Avoids spaces, matches dot in middle or end
		return /^[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+(:[0-9]+)?(\/.*)?$/.test(str) && !str.includes(' ');
	}

	function handleSearch(e: Event) {
		e.preventDefault();
		const query = searchQuery.trim();
		if (!query) return;

		saveHistory(query);

		if (isUrl(query)) {
			window.location.href = query;
		} else if (isDomain(query)) {
			window.location.href = `https://${query}`;
		} else {
			window.location.href = `https://google.com/search?q=${encodeURIComponent(query)}`;
		}
	}

	async function handleInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const val = input.value;
		// @ts-expect-error - inputType exists on InputEvent
		const inputType = e.inputType;

		searchQuery = val;

		// Skip autocomplete on deletion or if cursor is not at end
		if (!inputType || inputType.startsWith('delete') || input.selectionStart !== val.length) {
			return;
		}

		const bookmarks = config.bookmarks.map((b) => b.url.replace(/^https?:\/\//, ''));
		// Combine history and bookmarks for suggestions. Strip protocol from history for matching.
		const uniqueSources = Array.from(
			new Set([...history.map((h) => h.url.replace(/^https?:\/\//, '')), ...bookmarks])
		);

		const match = uniqueSources.find(
			(s) => s.toLowerCase().startsWith(val.toLowerCase()) && s.toLowerCase() !== val.toLowerCase()
		);

		if (match) {
			const originalCaseMatch = match;
			searchQuery = originalCaseMatch;
			await tick();
			input.value = originalCaseMatch;
			input.setSelectionRange(val.length, originalCaseMatch.length);
		}
	}

	let filteredHistory = $derived(
		history.filter((h) => h.url.toLowerCase().includes(historySearchQuery.toLowerCase()))
	);

	// Transform RRD data for graphs
	// Proxmox RRD data time is in seconds.
	function formatData(key: string, transform = (v: number) => v) {
		return (
			stats.rrd
				?.map((d) => ({
					x: d.time * 1000,
					y: transform(d[key] || 0)
				}))
				.filter((d) => !isNaN(d.y)) || []
		);
	}

	let cpuData = $derived(formatData('cpu', (v) => v * 100)); // 0-1 to %
	let memData = $derived(formatData('memused')); // Raw Bytes
	let netInData = $derived(formatData('netin')); // Raw Bytes
	let netOutData = $derived(formatData('netout')); // Raw Bytes

	let currentCpu = $derived(((stats.node?.cpu || 0) * 100).toFixed(1) + '%');
	let currentMem = $derived(formatBytes(stats.node?.memory?.used || 0));

	function getLastRrdValue(key: string) {
		if (!stats.rrd?.length) return 0;
		for (let i = stats.rrd.length - 1; i >= 0; i--) {
			const val = stats.rrd[i][key];
			if (val != null && !isNaN(val)) return val;
		}
		return 0;
	}

	let currentNetIn = $derived(formatSpeed(getLastRrdValue('netin')));
	let currentNetOut = $derived(formatSpeed(getLastRrdValue('netout')));

	// Dynamically retrieve icon component
	function getIcon(name: string): ComponentType | null {
		// @ts-expect-error - Index signature for Icons
		return ((Icons as Record<string, ComponentType>)[name] as ComponentType) || Icons.Link;
	}

	function focus(node: HTMLInputElement) {
		node.focus();
	}
</script>

<svelte:head>
	<title>System Dashboard</title>
</svelte:head>

<div
	class="flex min-h-screen w-full flex-col items-center gap-12 bg-background p-4 font-sans text-foreground"
>
	<!-- Top Section: System Dashboard -->
	<div class="grid w-full max-w-7xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
		<MetricGraph
			title="CPU Usage"
			value={currentCpu}
			data={cpuData}
			color="hsl(var(--primary))"
			id="cpu"
			formatter={(v) => v.toFixed(1) + '%'}
		/>
		<MetricGraph
			title="Memory Usage"
			value={currentMem}
			data={memData}
			color="hsl(var(--destructive))"
			id="mem"
			formatter={(v) => formatBytes(v)}
		/>
		<MetricGraph
			title="Network In"
			value={currentNetIn}
			data={netInData}
			color="hsl(var(--accent-foreground))"
			id="netin"
			formatter={(v) => formatSpeed(v)}
		/>
		<MetricGraph
			title="Network Out"
			value={currentNetOut}
			data={netOutData}
			color="hsl(var(--secondary-foreground))"
			id="netout"
			formatter={(v) => formatSpeed(v)}
		/>
	</div>

	<!-- Disk Usage Section -->
	<div class="grid w-full max-w-7xl grid-cols-1 gap-4 md:grid-cols-3">
		{#each stats.storage as drive (drive.alias)}
			{@const percent = drive.total ? Math.round((drive.used / drive.total) * 100) : 0}
			<Card class="border border-input bg-card shadow-lg">
				<CardHeader class="pb-2">
					<CardTitle class="text-sm font-medium text-muted-foreground uppercase">
						{drive.alias || drive.storage}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="mb-2 flex items-end justify-between">
						<span class="text-2xl font-bold">{percent}%</span>
						<span class="text-xs text-muted-foreground">
							{formatBytes(drive.used)} / {formatBytes(drive.total)}
						</span>
					</div>
					<Progress value={percent} class="h-2" />
				</CardContent>
			</Card>
		{/each}
	</div>

	<!-- Middle Section: Search & Navigation -->
	<div class="mt-10 flex w-full max-w-3xl flex-col items-center gap-10">
		<!-- Smart Search -->
		<form
			onsubmit={handleSearch}
			class="group relative w-full transform transition-all hover:scale-[1.01]"
		>
			<Input
				name="q"
				class="h-16 rounded-full border-input bg-card/80 pl-16 shadow-lg ring-offset-background backdrop-blur-sm focus-visible:ring-primary/50 md:text-xl"
				placeholder="Search or enter URL..."
				autofocus
				bind:value={searchQuery}
				oninput={handleInput}
				{@attach focus}
			/>
			<Search
				class="pointer-events-none absolute top-1/2 left-6 h-6 w-6 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
			/>
		</form>

		<!-- Bookmarks Grid -->
		<div class="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
			{#each config.bookmarks as bookmark (bookmark.url)}
				<!-- eslint-disable-next-line -->
				<a href={bookmark.url} target="_blank" rel="noreferrer" class="group">
					<Card
						class="flex h-32 cursor-pointer flex-col items-center justify-center gap-3 border-none bg-card backdrop-blur-sm transition-all duration-300 group-hover:ring-1 group-hover:ring-primary/20 hover:-translate-y-1 hover:bg-secondary/50 hover:shadow-xl"
					>
						{@const Icon = getIcon(bookmark.icon)}
						<Icon
							class="h-8 w-8 text-muted-foreground transition-colors group-hover:text-primary"
						/>
						<span
							class="px-2 text-center text-sm font-medium transition-colors group-hover:text-primary"
						>
							{bookmark.title}
						</span>
					</Card>
				</a>
			{/each}
		</div>

		<!-- History Controls -->
		<div class="flex gap-4">
			<Button
				variant="outline"
				size="sm"
				class="gap-2"
				onclick={() => {
					showHistoryModal = true;
				}}
			>
				<HistoryIcon class="h-4 w-4" />
				Manage History
			</Button>
		</div>
	</div>
</div>

{#if showHistoryModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
	>
		<Card class="flex max-h-[80vh] w-full max-w-2xl flex-col shadow-xl">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 border-b pb-4">
				<CardTitle>Search History</CardTitle>
				<Button
					variant="ghost"
					size="icon"
					onclick={() => {
						showHistoryModal = false;
					}}
				>
					<X class="h-4 w-4" />
				</Button>
			</CardHeader>
			<CardContent class="flex flex-1 flex-col gap-4 overflow-hidden pt-4">
				<div class="flex gap-2">
					<div class="relative flex-1">
						<Search
							class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input placeholder="Search history..." class="pl-9" bind:value={historySearchQuery} />
					</div>
				</div>

				<div class="flex-1 overflow-hidden rounded-md border">
					{#if filteredHistory.length === 0}
						<div class="flex h-full items-center justify-center text-sm text-muted-foreground">
							No history items found
						</div>
					{:else}
						<VirtualList
							items={filteredHistory}
							itemHeight={60}
							getKey={(item) => item.url + item.t}
							class="h-full"
						>
							{#snippet children(item)}
								<div class="group flex h-15 items-center justify-between px-2 hover:bg-muted">
									<div class="flex min-w-0 flex-col gap-0.5">
										<span class="truncate text-sm font-medium">{item.url}</span>
										<span class="text-xs text-muted-foreground">
											{new Date(item.t * 1000).toLocaleString()}
										</span>
									</div>
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:text-destructive"
										onclick={() => removeHistoryItem(item)}
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								</div>
							{/snippet}
						</VirtualList>
					{/if}
				</div>

				<div class="flex justify-between border-t pt-4">
					<Button variant="outline" size="sm" onclick={importHistory} class="gap-2">
						<Import class="h-4 w-4" />
						Import JSON
					</Button>
					{#if history.length > 0}
						<Button variant="destructive" size="sm" onclick={clearHistory} class="gap-2">
							<Trash2 class="h-4 w-4" />
							Clear All
						</Button>
					{/if}
				</div>
			</CardContent>
		</Card>
	</div>
{/if}
