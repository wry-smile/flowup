export function renderVueTypes(): string {
  return `declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent;
  export default component;
}
`
}

export function renderSvelteTypes(): string {
  return `declare module "*.svelte" {
  const component: any;
  export default component;
}
`
}
