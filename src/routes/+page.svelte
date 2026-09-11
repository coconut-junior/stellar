<script lang="ts">
   import { Button } from "$lib/components/ui/button";
   import { Input } from "$lib/components/ui/input";
   import { invoke } from '@tauri-apps/api/tauri';
   import { onMount } from 'svelte';

   type InDesign = {
      version: number;
      year: number;
      script_path: string;
   };

   let indesign: InDesign;

   onMount(async () => {
      indesign = await invoke<InDesign>('get_id_info');
   });

   async function runScript() {
      try {
         const result = await invoke<string>('run_script', { filename: 'cleanup.jsx' });
         console.log('script path:', result);
      } catch (err) {
         console.error('run_script failed:', err);
      }
   }
</script>

<main class="grid place-items-center h-full w-full bg-neutral-950">
   <section class="flex flex-col justify-center rounded-lg space-y-3 p-6 bg-neutral-900 w-[30rem]">
      <Button on:click={runScript}>Submit</Button>
      {#if indesign}
         <pre class="text-sm text-green-300">{JSON.stringify(indesign, null, 2)}</pre>
      {/if}

   </section>
</main>