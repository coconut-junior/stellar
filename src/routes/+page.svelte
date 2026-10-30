<script lang="ts">
   import Info from "$lib/settings.svelte";
   import Automation from "$lib/automation.svelte";
   import * as Tabs from "$lib/components/ui/tabs/index.js";
   import { Spinner } from "$lib/components/ui/spinner/index.js";
   import { getCurrentWindow } from "@tauri-apps/api/window";
   import { onMount } from "svelte";
   import Library from '@lucide/svelte/icons/library-big';
   import SettingsIcon from '@lucide/svelte/icons/settings';
   import LightRays from '$lib/components/LightRays.svelte';
  	import { Progress } from "$lib/components/ui/progress/index.js";

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

   let activeTab = $state("automation");
   let darkMode = $state(true);
   let minimizeAfterLaunch = $state(false);
   let uiScale = $state([100]);
   let primaryColor = $state("#4b73ff");
   let settingsLoaded = $state(false);
   let downloadStatus = $state<DownloadStatus>({
      progress: null,
      message: null,
      downloading: true
   });

   onMount(() => {
      const storedDarkMode = localStorage.getItem("stellar-dark-mode");
      const storedMinimizeAfterLaunch = localStorage.getItem("stellar-minimize-after-launch");
      const storedUiScale = localStorage.getItem("stellar-ui-scale");
      const storedPrimaryColor = localStorage.getItem("stellar-primary-color");

      if (storedDarkMode !== null) {
         darkMode = storedDarkMode === "true";
      }
      if (storedMinimizeAfterLaunch !== null) {
         minimizeAfterLaunch = storedMinimizeAfterLaunch === "true";
      }
      if (storedUiScale !== null) {
         try {
            const parsedUiScale = JSON.parse(storedUiScale);
            if (Array.isArray(parsedUiScale) && parsedUiScale.length === 1 && parsedUiScale[0] >= 80 && parsedUiScale[0] <= 120) {
               uiScale = [parsedUiScale[0]];
            }
         } catch {
            uiScale = [100];
         }
      }
      if (storedPrimaryColor !== null && /^#[\da-f]{6}$/i.test(storedPrimaryColor)) {
         primaryColor = storedPrimaryColor;
      }

      settingsLoaded = true;
   });

   $effect(() => {
      if (!settingsLoaded) return;

      localStorage.setItem("stellar-dark-mode", String(darkMode));
      localStorage.setItem("stellar-minimize-after-launch", String(minimizeAfterLaunch));
      localStorage.setItem("stellar-ui-scale", JSON.stringify(uiScale));
      localStorage.setItem("stellar-primary-color", primaryColor);
   });

   async function startWindowDrag(event: MouseEvent) {
      if (event.button !== 0) return;
      event.preventDefault();

      try {
         await getCurrentWindow().startDragging();
      } catch (error) {
         console.error("Could not drag the window:", error);
      }
   }
</script>


<LightRays class = "absolute inset-0 opacity-40" raysOrigin="top-right" raysColor={primaryColor} saturation={darkMode ? 10 : 5} raysSpeed={1} />

<main style={`zoom: ${uiScale[0] / 100}; --primary: ${primaryColor}`} class="{darkMode ? 'dark' : 'light'} bg-background text-foreground flex h-full w-full flex-col items-center gap-4 overflow-hidden absolute inset-0">
   <Tabs.Root bind:value={activeTab} class="relative flex min-h-0 flex-1 flex-col w-full px-6 pt-16 pb-6">

      <div class="absolute left-20 right-0 top-0 z-50 flex h-16 items-center gap-6 px-4">
         <img src={darkMode ? "/logo-horizontal.svg" : "/logo-horizontal-light.svg"} alt="logo" class="h-8 w-auto" />

         <!-- Tab Labels -->
         <Tabs.List class="grid grid-cols-2 bg-transparent gap-2">
            <Tabs.Trigger class = 'p-2' value="automation"><Library/>Library</Tabs.Trigger>
            <Tabs.Trigger value="info"><SettingsIcon/>Preferences</Tabs.Trigger>
         </Tabs.List>

         <div
            class="flex-1 self-stretch cursor-default select-none"
            role="presentation"
            onmousedown={startWindowDrag}
         ></div>
         <div aria-hidden="true" class="absolute bottom-0 left-[-5rem] right-0 h-px border-b-1 border-border"></div>
      </div>

      <Tabs.Content value="automation" class="w-full flex-1 overflow-y-auto mt-4 p-1 pb-10">
         <Automation
            onStatusChange={(status) => (downloadStatus = status)}
            minimizeAfterLaunch={minimizeAfterLaunch}
         />
      </Tabs.Content>

      <Tabs.Content value="info" class="min-h-0 w-full flex-1 overflow-y-auto mt-4 p-1 pb-10">
         <Info
            bind:darkMode
            bind:minimizeAfterLaunch
            bind:uiScale
            bind:primaryColor
         />
      </Tabs.Content>

   </Tabs.Root>

   <!-- Status bar -->
   <div class="flex justify-center fixed bottom-0 left-0 flex h-10 w-full items-center gap-2 overflow-hidden border-solid border-t border-border bg-background p-4">
      {#if downloadStatus.downloading}
         <Spinner />
      {/if}
      {#if downloadStatus.message}
         <p class="text-sm text-muted-foreground">{downloadStatus.message}</p>
      {:else if downloadStatus.progress && downloadStatus.downloading}
         <span class="text-sm text-muted-foreground">
            Downloading {downloadStatus.progress.filename}... ({downloadStatus.progress.current}/{downloadStatus.progress.total})
         </span>
         <Progress class="ml-auto w-[60%]" value = {downloadStatus.progress.current} max = {downloadStatus.progress.total}></Progress>
      {/if}
   </div>
</main>