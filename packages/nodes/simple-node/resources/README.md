# resources

Node-RED (since 1.3) serves any file in this directory under
`/resources/<module-name>/<file>` so the editor can load it.

For a scoped module (`@scope/foo`), the path becomes
`/resources/@scope/foo/<file>`.

## Example

Drop an image at `resources/help-banner.png`, then in your
`client/editor.html` or `client/help.html`:

```html
<img src="resources/<module-name>/help-banner.png" />
<script src="resources/<module-name>/library.js"></script>
```

Note the URL must be **relative** (no leading `/`), so the browser
resolves it against the editor URL.

See https://nodered.org/docs/creating-nodes/resources
