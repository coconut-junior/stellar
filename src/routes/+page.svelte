<script lang="ts">
   import Info from "$lib/settings.svelte";
   import Automation from "$lib/automation.svelte";
   import * as Tabs from "$lib/components/ui/tabs/index.js";
   import { Spinner } from "$lib/components/ui/spinner/index.js";
   import { onMount } from "svelte";
   import Bot from '@lucide/svelte/icons/bot';
   import SettingsIcon from '@lucide/svelte/icons/settings';

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

      settingsLoaded = true;
   });

   $effect(() => {
      if (!settingsLoaded) return;

      localStorage.setItem("stellar-dark-mode", String(darkMode));
      localStorage.setItem("stellar-minimize-after-launch", String(minimizeAfterLaunch));
      localStorage.setItem("stellar-ui-scale", JSON.stringify(uiScale));
   });
</script>

<main style={`zoom: ${uiScale[0] / 100}`} class="{darkMode ? 'dark' : ''} bg-background text-foreground flex h-full w-full flex-col items-center gap-4 overflow-hidden pb-12">
   <img src="/logo-horizontal.svg" alt="logo" class="h-10 mt-6 w-auto" />
   
   <Tabs.Root bind:value={activeTab} class="min-h-0 flex-1 flex-col w-full p-6">
      <Tabs.List class="grid  grid-cols-2">
         <Tabs.Trigger value="automation"><Bot/>Automation</Tabs.Trigger>
         <Tabs.Trigger value="info"><SettingsIcon/>Settings</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="automation" class="min-h-0 w-full flex-1 overflow-y-auto mt-4 p-1">
         <Automation
            onStatusChange={(status) => (downloadStatus = status)}
            minimizeAfterLaunch={minimizeAfterLaunch}
         />
      </Tabs.Content>

      <Tabs.Content value="info" class="min-h-0 w-full flex-1 overflow-y-auto mt-4 p-1">
         <Info
            bind:darkMode
            bind:minimizeAfterLaunch
            bind:uiScale
         />
      </Tabs.Content>

   </Tabs.Root>

   <div class="fixed bottom-0 left-0 flex h-10 w-full items-center gap-2 overflow-hidden bg-black p-2">
      {#if downloadStatus.downloading}
         <Spinner />
      {/if}
      {#if downloadStatus.message}
         <p class="text-sm text-muted-foreground">{downloadStatus.message}</p>
      {:else if downloadStatus.progress && downloadStatus.downloading}
         <span class="text-sm text-muted-foreground">
            {downloadStatus.progress.filename} ({downloadStatus.progress.current}/{downloadStatus.progress.total})
         </span>
      {/if}
   </div>
</main>