import { onCleanup, onMount } from 'solid-js'

interface UseNodeRedDialogSubmitGuardOptions {
  canSubmit: () => boolean
  selector?: string
}

/** Decide whether Node-RED's OK action may continue; this does not own form rules. */
export function useNodeRedDialogSubmitGuard(options: UseNodeRedDialogSubmitGuardOptions) {
  onMount(() => {
    const saveButton = document.querySelector<HTMLElement>(options.selector ?? '#node-dialog-ok')
    if (!saveButton) return

    const handleSave = (event: Event) => {
      if (options.canSubmit()) return

      event.preventDefault()
      event.stopImmediatePropagation()
    }

    saveButton.addEventListener('click', handleSave, true)
    onCleanup(() => saveButton.removeEventListener('click', handleSave, true))
  })
}
