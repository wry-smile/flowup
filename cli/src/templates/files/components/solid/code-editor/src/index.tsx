import { createEffect, createUniqueId, onCleanup, onMount } from 'solid-js'
import type { EditorRED } from 'node-red'

import type { CodeEditorProps } from './types'

declare const RED: EditorRED

export function CodeEditor(props: CodeEditorProps) {
  const editorId = props.id ?? `fui-code-editor-${createUniqueId()}`
  let editor: ReturnType<EditorRED['editor']['createEditor']> | undefined

  onMount(() => {
    editor = RED.editor.createEditor({
      id: editorId,
      mode: props.mode ?? `ace/mode/${props.language?.toLowerCase() ?? 'text'}`,
      value: props.value ?? '',
      readOnly: props.readOnly ?? props.disabled,
      options: props.options,
    })
    editor.on('change', () => props.onChange?.(editor?.getValue() ?? ''))
    onCleanup(() => {
      editor?.destroy()
      editor = undefined
    })
  })

  createEffect(() => {
    const nextValue = props.value ?? ''
    if (editor && editor.getValue() !== nextValue) editor.setValue(nextValue, -1)
  })

  return (
    <div
      id={editorId}
      class="node-text-editor w-full overflow-hidden rounded-(--fui-radius) border border-(--fui-border) bg-(--fui-surface) focus-within:border-(--fui-interactive) focus-within:ring-1 focus-within:ring-(--fui-focus)"
      data-fui-status={props.status}
      style={{ height: `${props.height ?? 240}px`, 'min-height': `${props.minHeight ?? 120}px` }}
    />
  )
}
