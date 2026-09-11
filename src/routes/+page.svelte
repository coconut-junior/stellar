<script lang="ts">
   import { Button } from '$lib/components/ui/button';
   import { Input } from '$lib/components/ui/input';
   import { invoke } from '@tauri-apps/api/tauri';
   import { onMount } from 'svelte';
   import * as Card from "$lib/components/ui/card/index.js";

   type InDesign = {
      version: number;
      year: number;
      script_path: string;
   };

   let inputValue = $state('');
   let indesign = $state<InDesign | null>(null);

   onMount(async () => {
      try {
         indesign = await invoke<InDesign>('get_id_info');
      } catch (err) {
         console.error('get_id_info failed:', err);
      }
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

<main class="dark text-foreground grid place-items-center h-full w-full bg-neutral-950">
   <section class="flex flex-col justify-center rounded-lg space-y-3 p-6 bg-neutral-900 w-[30rem]">
      <Input bind:value={inputValue} placeholder="Your name" />
      <Button onclick={runScript}>Submit</Button>

      {#if indesign}
         <p>InDesign Release Year: {indesign.year}</p>
         <p>{indesign.script_path}</p>
      {/if}
   </section>
</main>