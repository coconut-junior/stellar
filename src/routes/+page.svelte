<script lang="ts">
   import { Button } from '$lib/components/ui/button';
   import { Input } from '$lib/components/ui/input';
   import { invoke } from '@tauri-apps/api/tauri';
   import { listen } from '@tauri-apps/api/event';
   import { onMount } from 'svelte';
   import * as Card from "$lib/components/ui/card/index.js";
   import * as Item from "$lib/components/ui/item/index.js";

   type InDesign = {
      version: number;
      year: number;
      script_path: string;
   };

   let indesign = $state<InDesign | null>(null);
   let downloading = $state(false);
   let downloadProgress = $state<DownloadProgress | null>(null);
   let downloadMessage = $state<string | null>(null);

   type DownloadProgress = {
      filename: string;
      current: number;
      total: number;
      downloaded: number;
      size?: number;
   };

   onMount(async () => {
      const unlistenProgress = await listen<DownloadProgress>('scripts-download-progress', (event) => {
         downloadProgress = event.payload;
      });
      const unlistenComplete = await listen<string>('scripts-download-complete', (event) => {
         downloading = false;
         downloadMessage = event.payload;
      });
      const unlistenError = await listen<string>('scripts-download-error', (event) => {
         downloading = false;
         downloadMessage = null;
         alert(event.payload);
      });

      try {
         indesign = await invoke<InDesign>('get_id_info');
      } catch (error) {
         alert(String(error));
      }

      return () => {
         unlistenProgress();
         unlistenComplete();
         unlistenError();
      };
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

   async function downloadScripts() {
      downloading = true;
      downloadProgress = null;
      downloadMessage = null;
      try {
         await invoke<string>('download_scripts');
      } catch (error) {
         downloading = false;
         alert(String(error));
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
         {#if indesign}
            <Button size="sm" onclick={() => runScript("cleanup.jsx")}>
               Run cleanup script
            </Button>
            <Button size="sm" variant="outline" disabled={downloading} onclick={downloadScripts}>
               {downloading ? "Downloading..." : "Download scripts"}
            </Button>
         {/if}
      </Card.Footer>

      {#if downloadProgress}
         <Card.Content>
            <p class="text-sm">
               Downloading {downloadProgress.filename} ({downloadProgress.current}/{downloadProgress.total})
            </p>
            {#if downloadProgress.size}
               <progress
                  class="w-full"
                  max={downloadProgress.size}
                  value={downloadProgress.downloaded}
               ></progress>
            {/if}
         </Card.Content>
      {/if}

      {#if downloadMessage}
         <Card.Content>
            <p class="text-sm text-muted-foreground">{downloadMessage}</p>
         </Card.Content>
      {/if}
   </Card.Root>

</main>