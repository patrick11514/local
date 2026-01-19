<script lang="ts" generics="T">
	interface Props {
		items: T[];
		height?: string;
		itemHeight: number;
		getKey: (item: T) => unknown;
		children: import('svelte').Snippet<[T]>;
		class?: string;
	}

	let { items, height = '100%', itemHeight, getKey, children, class: className }: Props = $props();

	let scrollTop = $state(0);
	let viewportHeight = $state(0);

	let totalHeight = $derived(items.length * itemHeight);
	let startIndex = $derived(Math.floor(scrollTop / itemHeight));
	let endIndex = $derived(
		Math.min(
			items.length,
			Math.ceil((scrollTop + viewportHeight) / itemHeight) + 5 // +5 buffer
		)
	);

	// Ensure we don't slice out of bounds (slice handles end>length gracefully)
	let visibleItems = $derived(items.slice(Math.max(0, startIndex - 5), endIndex));
	// Adjust top padding to account for the buffer start
	let offsetStart = $derived(Math.max(0, startIndex - 5));
	let topPadding = $derived(offsetStart * itemHeight);

	function handleScroll(e: UIEvent) {
		scrollTop = (e.currentTarget as HTMLDivElement).scrollTop;
	}
</script>

<div
	class={className}
	style:height
	style:overflow-y="auto"
	onscroll={handleScroll}
	bind:clientHeight={viewportHeight}
>
	<div style:height="{totalHeight}px" style:position="relative">
		<div style:position="absolute" style:top="{topPadding}px" style:left="0" style:right="0">
			{#each visibleItems as item (getKey(item))}
				{@render children(item)}
			{/each}
		</div>
	</div>
</div>
