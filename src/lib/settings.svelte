<script lang="ts">
   import { invoke } from '@tauri-apps/api/tauri';
   import { onMount } from 'svelte';
   import * as Card from "$lib/components/ui/card/index.js";
   import * as Item from "$lib/components/ui/item/index.js";

   type InDesign = {
      version: number;
      year: number;
      script_path: string;
   };

   type InDesignResponse = {
      info: InDesign;
   };

   let indesign = $state<InDesign | null>(null);

   onMount(async () => {
      try {
         const response = await invoke<InDesignResponse>('get_id_info');
         indesign = response.info;
      } catch (error) {
         alert(String(error));
      }
   });
</script>

<div class="flex w-full flex-col items-center gap-4">
   <Card.Root class="w-full max-w-lg">
   <Card.Header>
      <Card.Title>About InDesign</Card.Title>
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
            <Item.Title>Version</Item.Title>
         </Item.Content>
         <Item.Description class="ml-auto text-right">
            {indesign?.version ?? "Unavailable"}
         </Item.Description>
      </Item.Root>
   </Card.Content>

</Card.Root>

   <Card.Root class="w-full max-w-lg">
      <Card.Header>
         <Card.Title>About Stellar</Card.Title>
         <Card.Description>Build and developer information</Card.Description>
      </Card.Header>

      <Card.Content>
         <Item.Root size="sm" variant="outline" class="mb-1">
            <Item.Content>
               <Item.Title>Version</Item.Title>
            </Item.Content>
            <Item.Description class="ml-auto text-right">3.0.0</Item.Description>
         </Item.Root>

         <Item.Root size="sm" variant="outline" class="mb-1">
            <Item.Content>
               <Item.Title>Build</Item.Title>
            </Item.Content>
            <Item.Description class="ml-auto text-right">Tauri 0.1.0</Item.Description>
         </Item.Root>

         <Item.Root size="sm" variant="outline" class="mb-1">
            <Item.Content>
               <Item.Title>Developer</Item.Title>
            </Item.Content>
            <Item.Description class="ml-auto text-right">Jimmy Blanck</Item.Description>
         </Item.Root>

         <Item.Root size="sm" variant="outline">
            <Item.Content>
               <Item.Title>Website</Item.Title>
            </Item.Content>
            <Item.Description class="ml-auto text-right">
               <a href="https://jbx.design" target="_blank" rel="noreferrer">jbx.design</a>
            </Item.Description>
         </Item.Root>

         <Item.Root size="sm" variant="outline">
            <Item.Content>
               <Item.Title>Email</Item.Title>
            </Item.Content>
            <Item.Description class="ml-auto text-right">
               <a href="emailto:contact@jbx.design" target="_blank" rel="noreferrer">contact@jbx.design</a>
            </Item.Description>
         </Item.Root>
      </Card.Content>
   </Card.Root>
</div>
