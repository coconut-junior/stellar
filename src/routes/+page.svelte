<script lang="ts">
   import { Button } from "$lib/components/ui/button";
   import { Input } from "$lib/components/ui/input";
   import { invoke } from '@tauri-apps/api/tauri';

   let name: string = '';
   let inputValue: string;
   let submitError = '';

   async function runScript() {
      try {
         const result = await invoke<string>('run_script', { filename: 'cleanup.jsx' });
         console.log('script path:', result);
      } catch (err) {
         console.error('run_script failed:', err);
         submitError = err instanceof Error ? err.message : String(err);
      }
   }
</script>

<main class="grid place-items-center h-full w-full bg-neutral-950">
   <section class="flex flex-col justify-center rounded-lg space-y-3 p-6 bg-neutral-900 w-[30rem]">
      <Input bind:value={inputValue} placeholder="Your name"/>
      <Button on:click={runScript}>Submit</Button>
      {#if submitError}
         <p class="text-sm text-red-400">{submitError}</p>
      {/if}

   </section>
</main>