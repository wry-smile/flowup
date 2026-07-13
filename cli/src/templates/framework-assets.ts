export function renderTailwindCss(): string {
  return `@import 'tailwindcss';
`
}

export function renderVueTailwindBridge(): string {
  return `import { createTailwindcssBridge } from "@wry-smile/flowup/client";
import tailwindcss from "./tailwind.css?inline";

export const useTailwindcss = createTailwindcssBridge(tailwindcss);
`
}

export function renderSvelteTypes(): string {
  return `declare module "*.svelte" {
  const component: any;
  export default component;
}
`
}
