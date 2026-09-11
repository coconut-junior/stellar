<script lang="ts">
   import { Button } from '$lib/components/ui/button';
   import { invoke } from '@tauri-apps/api/tauri';
   import { listen } from '@tauri-apps/api/event';
   import { onMount } from 'svelte';
   import * as Card from "$lib/components/ui/card/index.js";
   import * as Item from "$lib/components/ui/item/index.js";
   import * as Tabs from "$lib/components/ui/tabs/index.js";

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

   let indesign = $state<InDesignWithDependencies | null>(null);
   let activeTab = $state("indesign");
   let downloading = $state(false);
   let downloadProgress = $state<DownloadProgress | null>(null);
   let downloadMessage = $state<string | null>(null);

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

<main class="dark text-foreground flex h-full w-full flex-col items-center gap-4 overflow-y-auto bg-neutral-950 p-4">
   <Tabs.Root bind:value={activeTab} class="flex-col w-full max-w-3xl">
      <Tabs.List class="grid w-full grid-cols-2 border border-border bg-muted">
         <Tabs.Trigger value="indesign">InDesign</Tabs.Trigger>
         <Tabs.Trigger value="scripts">Scripts</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="indesign" class="mt-4">
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

            <div class="flex flex-col flex-wrap">
               {#if downloadProgress}
                  <Card.Root>
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
                  </Card.Root>
               {/if}
            </div>

            {#if downloadMessage}
               <Card.Content>
                  <p class="text-sm text-muted-foreground">{downloadMessage}</p>
               </Card.Content>
            {/if}
         </Card.Root>
      </Tabs.Content>

      <Tabs.Content value="scripts" class="mt-4">
         <div class="flex flex-wrap gap-2">
            {#each (indesign?.dependencies.scripts ?? []).filter((script) => !script.hidden) as script (script.filename)}
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
      </Tabs.Content>
   </Tabs.Root>

</main>