import { createApp } from 'vue'
import 'virtual:uno.css'
import App from './App.vue'
import { PLUGIN_DISPLAY_NAME, PLUGIN_NAME, PLUGIN_SCOPE } from '../constant/index.js'

RED.plugins.registerPlugin(PLUGIN_NAME, {
  onadd() {
    if (RED.sidebar.containsTab(PLUGIN_NAME)) return

    const target = document.createElement('div')
    target.dataset.flowupScope = PLUGIN_SCOPE
    target.className = 'flowup-vue-root'
    RED.sidebar.addTab({
      id: PLUGIN_NAME,
      name: PLUGIN_DISPLAY_NAME,
      label: PLUGIN_DISPLAY_NAME,
      iconClass: 'fa fa-puzzle-piece',
      content: target,
    })
    createApp(App).mount(target)
  },
})
