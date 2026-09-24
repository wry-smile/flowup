export const TEMPLATE_DEPENDENCY_VERSIONS = {
  '@types/jquery': '^4.0.1',
  '@types/node': '^26.0.1',
  '@types/node-red': '^1.3.5',
  'node-red': '^4.1.0',
  '@vitejs/plugin-vue': '^6.0.7',
  '@sveltejs/vite-plugin-svelte': '^7.2.0',
  svelte: '^5.56.4',
  'solid-js': '^1.9.15',
  'vite-plugin-solid': '^2.11.14',
  preact: '^10.29.8',
  '@preact/preset-vite': '^2.10.6',
  unocss: '^66.10.5',
  typescript: '^6.0.3',
  vite: '^8.1.0',
  vue: '^3.5.39',
} as const

export function getBaseTemplateDevDependencies(flowupSpecifier: string): string[] {
  return [
    `    "@types/jquery": "${TEMPLATE_DEPENDENCY_VERSIONS['@types/jquery']}"`,
    `    "@types/node-red": "${TEMPLATE_DEPENDENCY_VERSIONS['@types/node-red']}"`,
    `    "@wry-smile/flowup": "${flowupSpecifier}"`,
    `    "node-red": "${TEMPLATE_DEPENDENCY_VERSIONS['node-red']}"`,
    `    "typescript": "${TEMPLATE_DEPENDENCY_VERSIONS.typescript}"`,
    `    "vite": "${TEMPLATE_DEPENDENCY_VERSIONS.vite}"`,
  ]
}
