export const TEMPLATE_DEPENDENCY_VERSIONS = {
  '@types/jquery': '^4.0.1',
  '@types/node-red': '^1.3.5',
  '@vitejs/plugin-vue': '^6.0.7',
  '@sveltejs/vite-plugin-svelte': '^7.2.0',
  '@tailwindcss/vite': '^4.3.1',
  svelte: '^5.56.4',
  tailwindcss: '^4.3.2',
  typescript: '^6.0.3',
  vite: '^8.1.0',
  vue: '^3.5.39',
} as const

export function getBaseTemplateDevDependencies(flowupSpecifier: string): string[] {
  return [
    `    "@types/jquery": "${TEMPLATE_DEPENDENCY_VERSIONS['@types/jquery']}"`,
    `    "@types/node-red": "${TEMPLATE_DEPENDENCY_VERSIONS['@types/node-red']}"`,
    `    "@wry-smile/flowup": "${flowupSpecifier}"`,
    `    "typescript": "${TEMPLATE_DEPENDENCY_VERSIONS.typescript}"`,
    `    "vite": "${TEMPLATE_DEPENDENCY_VERSIONS.vite}"`,
  ]
}
