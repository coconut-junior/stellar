<script lang="ts">
   import { Button } from '$lib/components/ui/button';
   import { invoke } from '@tauri-apps/api/tauri';
   import { onMount } from 'svelte';
   import * as Card from "$lib/components/ui/card/index.js";

   type ScriptDependency = {
      name: string;
      filename: string;
      url: string;
      hidden: boolean;
      version: number;
      description: string;
   };

   type InDesignResponse = {
      dependencies: {
         scripts: ScriptDependency[];
      };
   };

   let scripts = $state<ScriptDependency[]>([]);

   onMount(async () => {
      try {
         const response = await invoke<InDesignResponse>('get_id_info');
         scripts = response.dependencies.scripts;
      } catch (error) {
         alert(String(error));
      }
   });

   async function runScript(filename: string) {
      try {
         await invoke('run_script', { filename });
      } catch (error) {
         const message = String(error);
         if (message.toLowerCase().includes('automation permission')) {
            console.error(message);
         } else {
            alert(message);
         }
      }
   }
</script>

<div class="flex flex-wrap gap-2">
   {#each scripts.filter((script) => !script.hidden) as script (script.filename)}
      <Card.Root class="w-60 max-w-lg">
         <Card.Header>
            <Card.Title>{script.name}</Card.Title>
         </Card.Header>
         <Card.Footer>
            <Button size="sm" onclick={() => runScript(script.filename)}>
               Run
            </Button>
         </Card.Footer>
      </Card.Root>
   {/each}
</div>
