<script setup lang="ts">
import { computed } from 'vue'
import { $t, useHydrateStore } from './hydrate'
import BehaviorPanel from './components/BehaviorPanel.vue'
import ConfigurationPanel from './components/ConfigurationPanel.vue'
import IntegrationPanel from './components/IntegrationPanel.vue'
import LifecyclePanel from './components/LifecyclePanel.vue'

const hydrate = useHydrateStore()
const { name, framework, mode, enabled, price, quantity, items } = hydrate.refs
const state = computed(() => ({
  name: name.value,
  framework: framework.value,
  mode: mode.value,
  enabled: enabled.value,
  price: price.value,
  quantity: quantity.value,
  items: items.value,
}))
</script>

<template>
  <main class="grid gap-3 bg-slate-50 p-3" data-flowup-scope="simple-plugin">
    <ConfigurationPanel />
    <BehaviorPanel />
    <LifecyclePanel />
    <IntegrationPanel />
    <details class="overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white">
      <summary>
        {{ $t('panel.stateInspector') }}
        <span>{{ $t('panel.editorDraft') }}</span>
      </summary>
      <p class="mt-0.5 text-[10px] text-slate-500">{{ $t('panel.doneAndDeploy') }}</p>
      <pre
        class="max-h-44 overflow-auto border-t border-slate-200 p-3 text-[9px] leading-4 whitespace-pre-wrap text-slate-500"
      >
        {{ JSON.stringify(state, null, 2) }}
      </pre>
    </details>
  </main>
</template>
