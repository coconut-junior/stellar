<script lang="ts">
   import { Button } from '$lib/components/ui/button';
   import { invoke } from '@tauri-apps/api/tauri';
   import { listen } from '@tauri-apps/api/event';
   import { onMount } from 'svelte';
   import * as Card from "$lib/components/ui/card/index.js";
   import Download from '@lucide/svelte/icons/download';

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

   onMount(() => {
      let disposed = false;
      let unlisten: (() => void)[] = [];

      const setup = async () => {
         const listeners = await Promise.all([
            listen<DownloadProgress>('scripts-download-progress', (event) => {
               downloadProgress = event.payload;
               onStatusChange({ progress: downloadProgress, message: downloadMessage, downloading });
            }),
            listen<string>('scripts-download-complete', (event) => {
               downloading = false;
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
      onStatusChange({ progress: downloadProgress, message: downloadMessage, downloading });
      try {
         await invoke<string>('download_scripts');
      } catch (error) {
         downloading = false;
         onStatusChange({ progress: downloadProgress, message: downloadMessage, downloading });
         alert(String(error));
      }
   }

   async function runScript(filename: string) {
      try {
         await invoke('run_script', { filename, minimizeAfterLaunch });
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

<Card.Root class="mb-4 w-full">
   <Card.Header class="flex flex-row items-center justify-between gap-4">
      <div>
         <Card.Title>Automations</Card.Title>
         <Card.Description>Speed up your InDesign workflow with powerful automations.</Card.Description>
      </div>
      <Button variant="outline" class="gap-2" disabled={downloading} onclick={downloadScripts}>
         {#if downloading}
            <span>Installing...</span>
         {:else}
            <Download class="size-3" aria-hidden="true"/>
            <span>Download latest</span>
         {/if}
      </Button>
   </Card.Header>
</Card.Root>

<Card.Root>
   <Card.Content>
      <div class="flex flex-wrap gap-2">
         {#each scripts.filter((script) => !script.hidden) as script (script.filename)}
            <Card.Root class="w-54 max-w-lg">
               <Card.Header>
                  <Card.Title>{script.name.length < 20 ? script.name : script.name.slice(0,20) + "..."}</Card.Title>
               </Card.Header>
               <Card.Footer>
                  <Button size="sm" variant="outline" onclick={() => runScript(script.filename)}>
                     ⚡️
                     Launch
                  </Button>
               </Card.Footer>
            </Card.Root>
         {/each}
      </div>
   </Card.Content>
</Card.Root>

