# icons

Palette icons for this node. Node-RED reads the file referenced by the
`icon` field you optionally configure in `client/index.ts` from this directory.

## Convention

- File name: `icons/simple-node.png` (recommended)
- Size: 24×24 px or 32×32 px recommended
- Format: PNG (with alpha)

## Referencing from the client

In `client/index.ts`:

```ts
RED.nodes.registerType("simple-node", {
  icon: "icons/simple-node.png",
  // ...
})
```

flowup build copies this directory into `dist/icons/` automatically.
