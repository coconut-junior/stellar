<script lang="ts">
   import Info from "$lib/info.svelte";
   import Automation from "$lib/automation.svelte";
   import * as Tabs from "$lib/components/ui/tabs/index.js";

   let activeTab = $state("automation");
   let darkMode = $state(true);
</script>

<main class="{darkMode ? 'dark bg-neutral-950' : ""} text-foreground flex h-full w-full flex-col items-center gap-4 overflow-y-auto p-4">
   <Tabs.Root bind:value={activeTab} class="flex-col w-full">
      <Tabs.List class="grid  grid-cols-2">
         <Tabs.Trigger value="automation">Automation</Tabs.Trigger>
         <Tabs.Trigger value="info">Info</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="automation" class="mt-4 w-full">
         <Automation />
      </Tabs.Content>

      <Tabs.Content value="info" class="mt-4 w-full">
         <Info />
      </Tabs.Content>

   </Tabs.Root>
</main>