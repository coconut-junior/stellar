<script lang="ts">
	import type { HTMLInputAttributes } from "svelte/elements";
	import { cn } from "$lib/utils.js";

	type InputProps = HTMLInputAttributes & {
		class?: string;
		value?: string | number | undefined;
		readonly?: boolean;
		[key: string]: any;
	};

	let {
		class: className = undefined,
		value = $bindable(),
		readonly = undefined,
		...rest
	}: InputProps = $props();
</script>

<input
	class={cn(
		"border-input placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50",
		className
	)}
	bind:value
	{readonly}
	{...rest}
/>
