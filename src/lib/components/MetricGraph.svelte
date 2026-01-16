<script lang="ts">
	import { scaleLinear, scaleTime } from 'd3-scale';
	import { curveBasis } from 'd3-shape';
	import { Area, Chart, Svg } from 'layerchart';

	let {
		data = [],
		title = '',
		color = 'hsl(var(--primary))',
		value = 0,
		id = 'chart'
	} = $props<{
		data: { x: number; y: number }[];
		title: string;
		color?: string;
		value?: string | number;
		id?: string;
	}>();

	// Calculate domain from data
	// let xDomain = $derived([
	// 	min(data, (d: { x: number; y: number }) => d.x) || 0,
	// 	max(data, (d: { x: number; y: number }) => d.x) || 10
	// ]);
	// let yDomain = $derived([0, max(data, (d: { x: number; y: number }) => d.y) || 100]);
</script>

<div class="flex h-full flex-col rounded-xl border bg-card p-4 shadow-sm">
	<div class="mb-2 flex items-center justify-between">
		<span class="text-sm font-medium text-muted-foreground">{title}</span>
		<span class="text-lg font-bold">{value}</span>
	</div>
	<div class="relative h-24 w-full">
		<Chart
			{data}
			x="x"
			y="y"
			xScale={scaleTime()}
			yScale={scaleLinear()}
			padding={{ top: 0, bottom: 0, left: 0, right: 0 }}
		>
			<Svg>
				<defs>
					<linearGradient id="{id}-gradient" x1="0" x2="0" y1="0" y2="1">
						<stop offset="0%" stop-color={color} stop-opacity="0.4" />
						<stop offset="100%" stop-color={color} stop-opacity="0" />
					</linearGradient>
				</defs>
				<Area
					line={{ stroke: color, strokeWidth: 2 }}
					fill="url(#{id}-gradient)"
					curve={curveBasis}
				/>
			</Svg>
		</Chart>
	</div>
</div>
