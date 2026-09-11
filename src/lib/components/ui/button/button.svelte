<script lang="ts">
	import { Button as ButtonPrimitive } from "bits-ui";
	import { type Props, buttonVariants } from "./index.js";
	import { cn } from "$lib/utils.js";

	type ButtonComponentProps = Props & {
		class?: string;
		variant?: Props["variant"];
		size?: Props["size"];
		builders?: Props["builders"];
		children?: import('svelte').Snippet;
		onclick?: (event: MouseEvent) => void;
		onkeydown?: (event: KeyboardEvent) => void;
		[key: string]: any;
	};

	let {
		class: className = undefined,
		variant = "default",
		size = "default",
		builders = [],
		children,
		onclick,
		onkeydown,
		...rest
	}: ButtonComponentProps = $props();
</script>

<ButtonPrimitive.Root
	{builders}
	class={cn(buttonVariants({ variant, size, className }))}
	type="button"
	{...rest}
	{onclick}
	{onkeydown}
>
	{@render children?.()}
</ButtonPrimitive.Root>
