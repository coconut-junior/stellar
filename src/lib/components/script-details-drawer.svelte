<script lang="ts">
   import { buttonVariants } from "$lib/components/ui/button";
   import * as Drawer from "$lib/components/ui/drawer";
   import X from "@lucide/svelte/icons/x";

   type Script = {
      name: string;
      filename: string;
      url: string;
      version: number;
      description: string;
   };

   type Props = {
      script: Script | null;
      darkMode: boolean;
      primaryColor: string;
      open?: boolean;
   };

   let { script, darkMode, primaryColor, open = $bindable(false) }: Props = $props();

   function getFilename(filename: string) {
      return filename.split(/[\\/]/).at(-1) ?? filename;
   }

   function getScriptType(filename: string) {
      return filename.split(".").at(-1)?.toUpperCase() ?? "Unknown";
   }
</script>

<Drawer.Root bind:open direction="right" shouldScaleBackground={false}>
   {#if script}
      <Drawer.Content
         class="{darkMode ? 'dark' : 'light'} h-full max-h-full w-[min(24rem,90vw)] flex-col gap-6 overflow-y-auto border-l border-border bg-background p-6 text-foreground"
         style={`--primary: ${primaryColor}`}
      >
         <Drawer.Header class="flex flex-row items-start justify-between gap-4 p-0 text-left">
            <div class="space-y-1">
               <Drawer.Title class="text-lg font-semibold">{script.name}</Drawer.Title>
               <Drawer.Description>Details about this automation script.</Drawer.Description>
            </div>
            <Drawer.Close
               class={buttonVariants({ variant: "ghost", size: "icon" })}
               aria-label="Close script information"
            >
               <X />
            </Drawer.Close>
         </Drawer.Header>

         <dl class="space-y-4 text-sm">
            <div class="space-y-1">
               <dt class="font-medium">Version</dt>
               <dd class="text-muted-foreground">{script.version}</dd>
            </div>
            <div class="space-y-1">
               <dt class="font-medium">Type</dt>
               <dd class="text-muted-foreground">{getScriptType(script.filename)}</dd>
            </div>
            <div class="space-y-1">
               <dt class="font-medium">Filename</dt>
               <dd class="break-all text-muted-foreground">{getFilename(script.filename)}</dd>
            </div>
            <div class="space-y-1">
               <dt class="font-medium">Description</dt>
               <dd class="whitespace-pre-wrap text-muted-foreground">
                  {script.description || "No description available."}
               </dd>
            </div>
            {#if script.url}
               <div class="space-y-1">
                  <dt class="font-medium">Source</dt>
                  <dd class="break-all">
                     <a class="text-primary underline-offset-4 hover:underline" href={script.url} target="_blank" rel="noreferrer">
                        {script.url}
                     </a>
                  </dd>
               </div>
            {/if}
         </dl>
      </Drawer.Content>
   {/if}
</Drawer.Root>
