import { onCleanup, onMount } from 'solid-js'

interface NodeRedEditorApi {
  notify?: (message: string, options?: { timeout?: number; type?: 'error' }) => unknown
}

interface UseNodeRedSubmitValidationOptions {
  getMessage: () => string | string[]
  onAttempt?: () => void
  selector?: string
  validate: () => boolean
}

/** Intercept the Node-RED editor save button and keep listener cleanup with the Solid owner. */
export function useNodeRedSubmitValidation(options: UseNodeRedSubmitValidationOptions) {
  onMount(() => {
    const saveButton = document.querySelector<HTMLElement>(options.selector ?? '#node-dialog-ok')
    if (!saveButton) return

    const handleSave = (event: Event) => {
      options.onAttempt?.()
      if (options.validate()) return

      event.preventDefault()
      event.stopImmediatePropagation()

      const message = options.getMessage()
      const text = (Array.isArray(message) ? message : [message]).filter(Boolean).join('\n')
      if (!text) return

      const editor = (globalThis as typeof globalThis & { RED?: NodeRedEditorApi }).RED
      editor?.notify?.(text, { type: 'error' })
    }

    saveButton.addEventListener('click', handleSave, true)
    onCleanup(() => saveButton.removeEventListener('click', handleSave, true))
  })
}
