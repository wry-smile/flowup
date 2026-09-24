<script lang="ts">
import { derived } from "svelte/store";
import { useHydrateStore } from "./hydrate";
import { t } from './i18n'
import { features, resourceUrl, tones } from '@client-shared/showcase'
const hydrateStore = useHydrateStore();
const name = derived(hydrateStore.state, $state => $state.name ?? "");
let selected = 0
let showFeatures = false

function handleNameInput(event: Event): void {
  const value = (event.currentTarget as HTMLInputElement).value.trim();
  hydrateStore.patch("name", value || undefined);
}
</script>

<section class="grid gap-4 rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm dark:border-rose-800 dark:bg-slate-900">
  <div class="flex items-center gap-3"><img class="h-10 w-10 rounded-full" src={resourceUrl('svelte-node', 'badge.svg')} alt="Svelte badge" /><h3 class="text-lg font-bold text-rose-900 dark:text-rose-100">Svelte editor</h3></div>
  <label class="grid gap-1 text-sm font-medium" for="node-input-name">{t('label.name')}
    <input id="node-input-name" class="rounded-lg border border-rose-300 bg-white px-3 py-2 focus:ring-2 focus:ring-rose-400" type="text" placeholder="Name" value={$name} on:input={handleNameInput} />
  </label>
  <div class="flex flex-wrap gap-2" role="group" aria-label="Color tone">
    {#each tones as tone, index}<button type="button" class="rounded-full px-3 py-1 text-sm ring-1 hover:opacity-80 {tone.className}" aria-pressed={selected === index} on:click={() => selected = index}>{tone.label}</button>{/each}
  </div>
  <button type="button" class="w-fit rounded-lg bg-rose-600 px-3 py-2 text-white hover:bg-rose-700" aria-expanded={showFeatures} on:click={() => showFeatures = !showFeatures}>Toggle features</button>
  {#if showFeatures}<ul class="list-disc rounded-lg bg-white p-4 pl-8 text-sm">{#each features as feature}<li>{feature}</li>{/each}</ul>{/if}
</section>
