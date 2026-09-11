<script lang="ts">
	import "../app.css";
	import { onMount } from "svelte";

	interface Props { children?: import('svelte').Snippet }

	let { children }: Props = $props();

	onMount(() => {
		document.getElementById("app-loading")?.remove();
	});
</script>

{@render children?.()}
