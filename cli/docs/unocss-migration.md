# Migrate an editor to scoped UnoCSS

Flowup's Vue and Svelte editors mount as regular framework apps. `--unocss` uses UnoCSS Wind4 utilities under `data-flowup-scope`, so multiple Node-RED packages can share the editor document without sharing generated utility rules.

## New packages

```bash
flowup gen --type node --name my-node --framework vue --unocss --non-interactive
```

Use `--type plugin` or `--framework svelte` for the other supported templates. The generated package contains the Vite plugin, `virtual:uno.css` import, scoped mount element, and `unocss` development dependency.

## Existing packages

1. Replace `--tailwind` with `--unocss` and `FLOWUP_GEN_TAILWIND` with `FLOWUP_GEN_UNOCSS` in scripts or automation. The former names are removed.
2. Install `unocss` as a development dependency and remove Tailwind packages that the editor no longer uses.
3. Configure the editor Vite build with the Flowup preset:

   ```ts
   import { presetFlowupWind4 } from '@wry-smile/flowup'
   import UnoCSS from 'unocss/vite'

   // In the editor build's Vite plugins:
   UnoCSS({ presets: [presetFlowupWind4({ scope: 'my-node' })] })
   ```

   For Svelte, place UnoCSS before the Svelte plugin. Use the same scope as the editor mount element.

4. Import `virtual:uno.css` in the editor entry. Mount Vue or Svelte on an element with `data-flowup-scope="my-node"`. Remove the Shadow DOM style bridge and mount the framework app directly. The old `@wry-smile/flowup/client` exports `createTailwindcssBridge`, `getStyleSheet`, and `TailwindBridgeOptions` have been removed.
5. Add the same scope attribute to the root of any teleported dialog or other overlay outside the editor container. Keep class names statically extractable or configure an UnoCSS safelist.

The preset scopes its generated utility selectors, reset, theme variables, `@property` names, and animation keyframes. It does not rewrite hand-authored global CSS or `@font-face` rules; review those separately when the package uses them. No separate PostCSS setup is required for the generated UnoCSS styles.

See [`simple-node`](https://github.com/wry-smile/flowup/tree/main/packages/nodes/simple-node) for the Vue editor example. Run `flowup build` after migrating and inspect the generated editor CSS if the package has custom global styles.
