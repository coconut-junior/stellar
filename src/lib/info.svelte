<script lang="ts">
   import { Button } from '$lib/components/ui/button';
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

   type ScriptDependency = {
      name: string;
      filename: string;
      url: string;
      hidden: boolean;
      version: number;
      description: string;
   };

   type InDesignResponse = {
      info: InDesign;
      dependencies: {
         scripts: ScriptDependency[];
      };
   };

   type InDesignWithDependencies = InDesign & {
      dependencies: {
         scripts: ScriptDependency[];
      };
   };

   type DownloadProgress = {
      name: string;
      filename: string;
      url: string;
      hidden: boolean;
      version: number;
      description: string;
      current: number;
      total: number;
      downloaded: number;
      size?: number;
   };

   let indesign = $state<InDesignWithDependencies | null>(null);
   let downloading = $state(false);
   let downloadProgress = $state<DownloadProgress | null>(null);
   let downloadMessage = $state<string | null>(null);

   onMount(() => {
      let disposed = false;
      let unlisten: (() => void)[] = [];

      const setup = async () => {
         const listeners = await Promise.all([
            listen<DownloadProgress>('scripts-download-progress', (event) => {
               downloadProgress = event.payload;
            }),
            listen<string>('scripts-download-complete', (event) => {
               downloading = false;
               downloadMessage = event.payload;
            }),
            listen<string>('scripts-download-error', (event) => {
               downloading = false;
               downloadMessage = null;
               alert(event.payload);
            })
         ]);

         if (disposed) {
            listeners.forEach((unlisten) => unlisten());
            return;
         }

         unlisten = listeners;

         try {
            const response = await invoke<InDesignResponse>('get_id_info');
            indesign = { ...response.info, dependencies: response.dependencies };
            void downloadScripts();
         } catch (error) {
            alert(String(error));
         }
      };

      void setup();

      return () => {
         disposed = true;
         unlisten.forEach((stopListening) => stopListening());
      };
   });

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
