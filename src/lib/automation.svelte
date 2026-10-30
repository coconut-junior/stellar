<script lang="ts">
   import { Button } from '$lib/components/ui/button';
   import { invoke } from '@tauri-apps/api/core';
   import { listen } from '@tauri-apps/api/event';
   import { onMount } from 'svelte';
   import { fly } from 'svelte/transition';
   import * as Card from "$lib/components/ui/card/index.js";
   import ScriptDetailsDrawer from "$lib/components/script-details-drawer.svelte";
   import AutomationCard from "$lib/components/automation-card.svelte";
   import Update from '@lucide/svelte/icons/rotate-cw';
   import Star from '@lucide/svelte/icons/star';
   import SearchIcon from "@lucide/svelte/icons/search";
   import FolderIcon from "@lucide/svelte/icons/folder";
   import Zap from "@lucide/svelte/icons/zap";
   import * as InputGroup from "$lib/components/ui/input-group/index.js";
   import { Skeleton } from "$lib/components/ui/skeleton/index.js";
   import * as Tooltip from "$lib/components/ui/tooltip/index.js";
   import Separator from './components/ui/separator/separator.svelte';
  
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
      darkMode: boolean;
      primaryColor: string;
   };

   let { onStatusChange, minimizeAfterLaunch, darkMode, primaryColor }: Props = $props();

   let scripts = $state<ScriptDependency[]>([]);
   let downloading = $state(true);
   let downloadProgress = $state<DownloadProgress | null>(null);
   let downloadMessage = $state<string | null>(null);
   let searchText = $state("");
   let completedDownloads = $state<string[]>([]);
   let activeDownloadFilename = $state<string | null>(null);
   let prefersReducedMotion = $state(false);
   let bookmarkedScripts = $state<string[]>([]);
   let scriptsLoaded = $state(false);
   let selectedScript = $state<ScriptDependency | null>(null);
   let scriptDetailsOpen = $state(false);

   onMount(() => {
      let disposed = false;
      let unlisten: (() => void)[] = [];
      try {
         const storedBookmarks = localStorage.getItem('stellar-bookmarked-scripts');
         if (storedBookmarks) {
            const parsedBookmarks: unknown = JSON.parse(storedBookmarks);
            if (Array.isArray(parsedBookmarks) && parsedBookmarks.every((filename) => typeof filename === 'string')) {
               bookmarkedScripts = parsedBookmarks;
            } else {
               console.error('Stored automation bookmarks have an invalid format.');
            }
         }
      } catch (error) {
         console.error('Unable to load automation bookmarks:', error);
      }

      const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const updateReducedMotion = (event: MediaQueryListEvent) => {
         prefersReducedMotion = event.matches;
      };
      prefersReducedMotion = reducedMotionQuery.matches;
      reducedMotionQuery.addEventListener('change', updateReducedMotion);

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
            }),
            listen<{ previous: number; current: number }>('indesign-version-changed', (event) => {
               alert(
                  `A new version of InDesign (${event.payload.current}) was installed since Stellar last ran (version ${event.payload.previous}). Stellar needs to reinstall its automations.`
               );
               void downloadScripts(true);
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
            scriptsLoaded = true;
            void downloadScripts();
         } catch (error) {
            alert(String(error));
         }
      };

      void setup();

      return () => {
         disposed = true;
         unlisten.forEach((stopListening) => stopListening());
         reducedMotionQuery.removeEventListener('change', updateReducedMotion);
      };
   });

   async function downloadScripts(updateVersionMarker = false) {
      downloading = true;
      downloadProgress = null;
      downloadMessage = null;
      completedDownloads = [];
      activeDownloadFilename = null;
      onStatusChange({ progress: downloadProgress, message: downloadMessage, downloading });
      try {
         await invoke<string>('download_scripts', { updateVersionMarker });
      } catch (error) {
         downloading = false;
         onStatusChange({ progress: downloadProgress, message: downloadMessage, downloading });
         alert(String(error));
      }
   }

   async function openScriptFolder() {
      await invoke<string>('open_script_folder');
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

   function isBookmarked(filename: string) {
      return bookmarkedScripts.includes(filename);
   }

   function toggleBookmark(filename: string) {
      const updatedBookmarks = isBookmarked(filename)
         ? bookmarkedScripts.filter((bookmarkedFilename) => bookmarkedFilename !== filename)
         : [...bookmarkedScripts, filename];

      try {
         localStorage.setItem('stellar-bookmarked-scripts', JSON.stringify(updatedBookmarks));
         bookmarkedScripts = updatedBookmarks;
      } catch (error) {
         console.error('Unable to save automation bookmarks:', error);
         alert(`Unable to save automation bookmarks: ${String(error)}`);
      }
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

<div class:automation-downloading={downloading}>
<Tooltip.Provider>
<Card.Root class="mb-4 mt-4 w-full">
   <Card.Header class="flex wrap items-center flex-col sm:flex-row sm:justify-between gap-4">
      
      <div class = "flex">
         <Card.Title>Automation Library</Card.Title>
      </div>

      <div class="flex gap-2">
         <InputGroup.Root>
            <InputGroup.Input placeholder="Search..." bind:value={searchText} />
            <InputGroup.Addon>
               <SearchIcon />
            </InputGroup.Addon>
         </InputGroup.Root>

         <Tooltip.Root>
            <Tooltip.Trigger>
               <Button variant="outline" size="icon" onclick= {() => openScriptFolder()}><FolderIcon/></Button>
            </Tooltip.Trigger>
            <Tooltip.Content>
               Open script folder
            </Tooltip.Content>
         </Tooltip.Root>

         <Button variant="outline" class="gap-2" disabled={downloading} onclick={() => downloadScripts()}>
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
      {#if scriptsLoaded}
         <section class="flex flex-col gap-4 mb-4">
            <h3 class="text-lg font-semibold">Favorites</h3>
            {#if scripts.some((script) => !script.hidden && isBookmarked(script.filename))}
               <div class="flex flex-wrap gap-2">
                  {#each scripts.filter((script) => !script.hidden && isBookmarked(script.filename) && isDownloaded(script.filename)) as script (script.filename)}
                     <Button
                        class="max-w-full"
                        aria-label={`Launch ${script.name}`}
                        hidden={!script.name.toLowerCase().match(searchText.toLowerCase())}
                        onclick={() => runScript(script)}
                     >
                        <Zap/>
                        <span class="truncate">{script.name}</span>
                     </Button>
                  {/each}
               </div>
            {:else}
               <div class="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-8 text-center">
                  <Star class="size-6 text-muted-foreground" aria-hidden="true" />
                  <p class="font-medium">No favorites yet</p>
                  <p class="text-sm text-muted-foreground">
                     Click the star on an automation to add it to your favorites.
                  </p>
               </div>
            {/if}
            <Separator/>
         </section>
      {/if}
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-4">
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
         <div
            in:fly={{ y: 28, duration: prefersReducedMotion ? 0 : 420 }}
            hidden={!script.name.toLowerCase().match(searchText.toLowerCase())}
         >
            <AutomationCard
               {script}
               bookmarked={isBookmarked(script.filename)}
               onLaunch={() => runScript(script)}
               onToggleBookmark={() => toggleBookmark(script.filename)}
               onEdit={() => editCode(script.filename)}
               onShowDetails={() => {
                  selectedScript = script;
                  scriptDetailsOpen = true;
               }}
            />
         </div>
         {/if}
         {/each}
      </div>
      
   </Card.Content>
   </Card.Root>

   <ScriptDetailsDrawer
      bind:open={scriptDetailsOpen}
      script={selectedScript}
      {darkMode}
      {primaryColor}
   />
   </Tooltip.Provider>
</div>

<style>
   :global(.automation-downloading),
   :global(.automation-downloading *) {
      cursor: wait !important;
   }
</style>
