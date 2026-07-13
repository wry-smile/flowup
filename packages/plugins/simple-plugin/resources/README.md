# resources

Node-RED (since 1.3) serves any file in this directory under
`/resources/<module-name>/<file>` so the editor can load it.

For a scoped module (`@scope/foo`), the path becomes
`/resources/@scope/foo/<file>`.

Reference from your `client/editor.html` / `client/help.html` with
**relative** URLs (no leading `/`):

```html
<img src="resources/<module-name>/banner.png" />
<script src="resources/<module-name>/library.js"></script>
```

See https://nodered.org/docs/creating-nodes/resources
