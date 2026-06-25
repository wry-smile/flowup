import { defineConfig } from '@wry-smile/flowup'

export default defineConfig({
  scope: 'simple-node',
  // flowup build 目标产物是单个 <scope>.html(JS/CSS 内联),
  // 该插件是 cli 内置 Rollup hook 实现,无需安装任何外部包。
  singleFilePlugin: true,
});
