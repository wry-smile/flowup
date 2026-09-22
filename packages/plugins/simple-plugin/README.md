# simple-plugin

A Node-RED editor plugin scaffolded with [flowup](https://github.com/wry-smile/flowup).

## UI Stack

- Plain TypeScript plugin registration
- No framework-specific client template is generated for plugins

## Layout

```
simple-plugin/
├── package.json
├── flowup.config.ts
├── constant/
├── runtime/
├── client/
├── types/
├── locales/
├── icons/
└── resources/
```

## Build and Package

```bash
pnpm install
pnpm build
npm pack --dry-run
```

A full build generates `dist/flowup.manifest.json` for `flowup assemble`.
