<script lang="ts">
   import { Button } from "$lib/components/ui/button";
   import { Input } from "$lib/components/ui/input";

   let name: string = '';
   let inputValue: string;
</script>

<main class="grid place-items-center h-full w-full bg-neutral-950">
   <section class="flex flex-col justify-center rounded-lg space-y-3 p-6 bg-neutral-900 w-[30rem]">
      <Input bind:value={inputValue} placeholder="Your name"/>
      <Button on:click={() => name = `Your name is ${ inputValue }!`}>Submiut</Button>
   </section>
</main>