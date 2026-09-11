<script lang="ts">
   import { Button } from '$lib/components/ui/button';
   import { Input } from '$lib/components/ui/input';
   import { invoke } from '@tauri-apps/api/tauri';
   import { onMount } from 'svelte';
   import * as Card from "$lib/components/ui/card/index.js";
   import * as Item from "$lib/components/ui/item/index.js";

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
   <Card.Root class="w-full max-w-lg">
      <Card.Header>
         <Card.Title>InDesign</Card.Title>
         <Card.Description>Application information</Card.Description>
      </Card.Header>

      <Card.Content>
         <Item.Root size="sm" variant="outline" class="mb-1">
            <Item.Content>
               <Item.Title>Release year</Item.Title>
            </Item.Content>
            <Item.Description class="ml-auto text-right">
               {indesign?.year ?? "Unavailable"}
            </Item.Description>
         </Item.Root>

         <Item.Root size="sm" variant="outline" class="mb-1">
            <Item.Content>
               <Item.Title>Version number</Item.Title>
            </Item.Content>
            <Item.Description class="ml-auto text-right">
               {indesign?.version ?? "Unavailable"}
            </Item.Description>
         </Item.Root>
      </Card.Content>

      <Card.Footer>
         <Button size="sm" onclick={runScript}>Run cleanup script</Button>
      </Card.Footer>
   </Card.Root>

</main>