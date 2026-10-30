<script lang="ts">
   import { Button } from "$lib/components/ui/button";
   import * as ButtonGroup from "$lib/components/ui/button-group/index.js";
   import * as Card from "$lib/components/ui/card/index.js";
   import { Badge } from "$lib/components/ui/badge/index.js";
   import * as Tooltip from "$lib/components/ui/tooltip/index.js";
   import CodeXML from "@lucide/svelte/icons/code-xml";
   import InfoIcon from "@lucide/svelte/icons/info";
   import Star from "@lucide/svelte/icons/star";
   import Zap from "@lucide/svelte/icons/zap";

   type Script = {
      name: string;
      filename: string;
   };

   type Props = {
      script: Script;
      bookmarked: boolean;
      onLaunch: () => void;
      onToggleBookmark: () => void;
      onEdit: () => void;
      onShowDetails: () => void;
   };

   let {
      script,
      bookmarked,
      onLaunch,
      onToggleBookmark,
      onEdit,
      onShowDetails
   }: Props = $props();
</script>

<Card.Root size="sm">
   <Card.Header>
      <Card.Title class="w-full min-w-0">
         <div class="flex w-full min-w-0 items-center gap-2">
            <span class="min-w-0 flex-1 truncate">{script.name}</span>
            <Badge class="shrink-0" variant="outline">{script.filename.split('.')[1].toUpperCase()}</Badge>
         </div>
      </Card.Title>
   </Card.Header>
   <Card.Footer class="gap-1">
      <Button variant="outline" onclick={onLaunch}>
         <Zap class="text-amber-500" />
         Launch
      </Button>
      <ButtonGroup.Root>
         <Tooltip.Root>
            <Tooltip.Trigger>
               {#snippet child({ props })}
                  <Button
                     {...props}
                     size="icon"
                     variant="outline"
                     aria-label={bookmarked ? `Remove ${script.name} favorite` : `Favorite ${script.name}`}
                     aria-pressed={bookmarked}
                     class={bookmarked ? "text-amber-500" : ""}
                     onclick={onToggleBookmark}
                  >
                     <Star fill={bookmarked ? "currentColor" : "none"} />
                  </Button>
               {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content>
               {bookmarked ? "Remove favorite" : "Favorite automation"}
            </Tooltip.Content>
         </Tooltip.Root>
         <Tooltip.Root>
            <Tooltip.Trigger>
               {#snippet child({ props })}
                  <Button {...props} size="icon" variant="outline" aria-label="Edit code" onclick={onEdit}>
                     <CodeXML />
                  </Button>
               {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content>
               Edit code
            </Tooltip.Content>
         </Tooltip.Root>
         <Tooltip.Root>
            <Tooltip.Trigger>
               {#snippet child({ props })}
                  <Button
                     {...props}
                     size="icon"
                     variant="outline"
                     aria-label={`More information about ${script.name}`}
                     onclick={onShowDetails}
                  >
                     <InfoIcon />
                  </Button>
               {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content>
               Script information
            </Tooltip.Content>
         </Tooltip.Root>
      </ButtonGroup.Root>
   </Card.Footer>
</Card.Root>
