<script lang="ts">
   import { Button } from '$lib/components/ui/button';
   import { invoke } from '@tauri-apps/api/core';
   import { listen } from '@tauri-apps/api/event';
   import { onMount } from 'svelte';
   import * as Card from "$lib/components/ui/card/index.js";
   import Update from '@lucide/svelte/icons/rotate-cw';
   import CodeXML from '@lucide/svelte/icons/code-xml';
   import SearchIcon from "@lucide/svelte/icons/search";
   import * as InputGroup from "$lib/components/ui/input-group/index.js";
   import { Skeleton } from "$lib/components/ui/skeleton/index.js";
   import * as Tooltip from "$lib/components/ui/tooltip/index.js";
   import { Badge } from "$lib/components/ui/badge/index.js";
  
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

   type DownloadStatus = {
      progress: DownloadProgress | null;
      message: string | null;
      downloading: boolean;
   };

   type Props = {
      onStatusChange: (status: DownloadStatus) => void;
      minimizeAfterLaunch: boolean;
   };

   let { onStatusChange, minimizeAfterLaunch }: Props = $props();

   let scripts = $state<ScriptDependency[]>([]);
   let downloading = $state(true);
   let downloadProgress = $state<DownloadProgress | null>(null);
   let downloadMessage = $state<string | null>(null);
   let searchText = $state("");
   let completedDownloads = $state<string[]>([]);
   let activeDownloadFilename = $state<string | null>(null);

   onMount(() => {
      let disposed = false;
      let unlisten: (() => void)[] = [];

      const setup = async () => {
         const listeners = await Promise.all([
            listen<DownloadProgress>('scripts-download-progress', (event) => {
               downloadProgress = event.payload;
               if (activeDownloadFilename && activeDownloadFilename !== event.payload.filename) {
                  markDownloaded(activeDownloadFilename);
               }
               activeDownloadFilename = event.payload.filename;
               if (event.payload.size !== undefined && event.payload.downloaded >= event.payload.size) {
                  markDownloaded(event.payload.filename);
               }
               onStatusChange({ progress: downloadProgress, message: downloadMessage, downloading });
            }),
            listen<string>('scripts-download-complete', (event) => {
               downloading = false;
               completedDownloads = scripts.map((script) => getFilename(script.filename));
               activeDownloadFilename = null;
               downloadMessage = event.payload;
               onStatusChange({ progress: downloadProgress, message: downloadMessage, downloading });
            }),
            listen<string>('scripts-download-error', (event) => {
               downloading = false;
               downloadMessage = null;
               onStatusChange({ progress: downloadProgress, message: downloadMessage, downloading });
               alert(event.payload);
            })
         ]);

         if (disposed) {
            listeners.forEach((stopListening) => stopListening());
            return;
         }

         unlisten = listeners;

         try {
            const response = await invoke<InDesignResponse>('get_id_info');
            scripts = response.dependencies.scripts;
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
      completedDownloads = [];
      activeDownloadFilename = null;
      onStatusChange({ progress: downloadProgress, message: downloadMessage, downloading });
      try {
         await invoke<string>('download_scripts');
      } catch (error) {
         downloading = false;
         onStatusChange({ progress: downloadProgress, message: downloadMessage, downloading });
         alert(String(error));
      }
   }

   function getFilename(filename: string) {
      return filename.split(/[\\/]/).at(-1) ?? filename;
   }

   function markDownloaded(filename: string) {
      if (!completedDownloads.includes(filename)) {
         completedDownloads = [...completedDownloads, filename];
      }
   }

   function isDownloaded(filename: string) {
      return completedDownloads.includes(getFilename(filename));
   }

   async function editCode(filename: string) {
      await invoke('edit_code', {filename});
   }

   async function runScript(script: ScriptDependency) {
      try {
         const url = script.filename.toLowerCase().endsWith('.html') ? script.url : undefined;
         await invoke('run_script', { filename: script.filename, url, minimizeAfterLaunch });
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

<Tooltip.Provider>
<Card.Root class="mb-4 w-full">
   <Card.Header class="flex wrap items-center flex-col sm:flex-row sm:justify-between gap-4">
      <div>
         <Card.Title>Automation Library</Card.Title>
      </div>

      <div class="flex gap-2">
         <InputGroup.Root>
            <InputGroup.Input placeholder="Search..." bind:value={searchText} />
            <InputGroup.Addon>
               <SearchIcon />
            </InputGroup.Addon>
         </InputGroup.Root>

         <Button variant="outline" class="gap-2" disabled={downloading} onclick={downloadScripts}>
            {#if downloading}
               <span>Installing...</span>
            {:else}
               <Update class="size-3" aria-hidden="true"/>
               <span>Update Now</span>
            {/if}
         </Button>
      </div>
      
   </Card.Header>
   
</Card.Root>

<Card.Root>
   <Card.Content>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
         {#each scripts.filter((script) => !script.hidden) as script (script.filename)}
         {#if !isDownloaded(script.filename)}
            <Card.Root size="sm" hidden={!script.name.toLowerCase().match(searchText.toLowerCase())} aria-label={`Downloading ${script.name}`} aria-busy="true">
               <Card.Header>
                  <Skeleton class="h-5 w-3/4" />
                  <div class="flex items-center gap-2">
                     <Skeleton class="h-4 w-10" />
                     <Skeleton class="h-4 w-20" />
                  </div>
               </Card.Header>
               <Card.Footer class="gap-1">
                  <Skeleton class="h-9 w-20" />
                  <Skeleton class="h-9 w-9" />
               </Card.Footer>
            </Card.Root>
         {:else}
         <Card.Root size="sm" hidden={!script.name.toLowerCase().match(searchText.toLowerCase())}>
               <Card.Header>
                  <Card.Title>
                     <span class="text-ellipsis truncate">{script.name}</span>
                  </Card.Title>
                  <Card.Description>
                     <Badge variant="outline">{script.filename.split('.')[1].toUpperCase()}</Badge>
                     Version {script.version}
                  </Card.Description>
               </Card.Header>
               <Card.Footer class="gap-1">
                  <Button variant="outline" disabled={false} onclick={() => runScript(script)}>
                     ⚡️
                     Launch
                  </Button>
                  <Tooltip.Root>
                     <Tooltip.Trigger>
                        <Button size="icon" variant="outline" disabled={false} onclick={()=>editCode(script.filename)}>
                           <CodeXML/>
                        </Button></Tooltip.Trigger>
                     <Tooltip.Content>
                        Edit code
                     </Tooltip.Content>
                  </Tooltip.Root>
                  
               </Card.Footer>
            </Card.Root>
         {/if}
         {/each}
      </div>
      
   </Card.Content>
</Card.Root>
</Tooltip.Provider>
