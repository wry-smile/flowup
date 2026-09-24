<script lang="ts">
  import ChildValue from './ChildValue.svelte'

  export let items: string[]
  export let onPatchItems: (items: string[]) => void
  let count = 0
  let childValue = 3
  let showList = true
</script>

<section class="overflow-hidden rounded-xl border border-slate-200 bg-white">
  <header class="flex items-center justify-between gap-3 border-b border-slate-200 px-3.5 py-2.5">
    <div>
      <h2 class="m-0 text-xs font-semibold">02 · Reactive Behavior</h2>
      <p class="mt-0.5 text-[10px] text-slate-500">State, rendering and component communication</p>
    </div>
    <span
      class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500"
    >
      runtime only
    </span>
  </header>
  <div class="flex items-center justify-between gap-2 border-t border-slate-200 px-3.5 py-3">
    <div>
      <p class="text-[11px] font-medium text-slate-900">Local counter</p>
      <p class="text-[10px] text-slate-500">State + click events</p>
    </div>
    <div class="flex items-center justify-between gap-2">
      <button
        class="inline-flex size-8 h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-0 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
        type="button"
        aria-label="Decrement"
        on:click={() => count--}
      >
        −
      </button>
      <strong>{count}</strong>
      <button
        class="inline-flex size-8 h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-0 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
        type="button"
        aria-label="Increment"
        on:click={() => count++}
      >
        +
      </button>
    </div>
  </div>
  <div class="border-t border-slate-200 px-3.5 py-3">
    <div class="flex items-center justify-between gap-2">
      <div>
        <p class="text-[11px] font-medium text-slate-900">Conditional list</p>
        <p class="text-[10px] text-slate-500">Keyed rendering + add/remove</p>
      </div>
      <div class="flex items-center justify-between gap-2">
        <label class="text-[10px] text-slate-500">
          <input type="checkbox" bind:checked={showList} /> Show
        </label>
        <button
          class="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
          type="button"
          on:click={() => onPatchItems([...items, `Item ${items.length + 1}`])}
        >
          + Add
        </button>
      </div>
    </div>
    {#if showList}
      <ul class="mt-2.5 flex flex-wrap gap-1.5">
        {#each items as item, index (`${item}-${index}`)}
          <li
            class="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-600"
          >
            {item}
            <button
              type="button"
              aria-label={`Remove ${item}`}
              on:click={() => onPatchItems(items.filter((_, itemIndex) => itemIndex !== index))}
            >
              ×
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="text-[10px] text-slate-500">List hidden</p>
    {/if}
  </div>
  <div class="flex items-center justify-between gap-2 border-t border-slate-200 px-3.5 py-3">
    <div>
      <p class="text-[11px] font-medium text-slate-900">Child component</p>
      <p class="text-[10px] text-slate-500">Parent value → child · child event → parent</p>
    </div>
    <ChildValue value={childValue} onIncrement={() => childValue++} />
  </div>
</section>
