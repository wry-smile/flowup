import { Show, createSignal, onCleanup, onMount } from 'solid-js'
import { Portal } from 'solid-js/web'

import type { DialogProps } from './types'
function createScopedPortalHost(anchor: HTMLElement, mountTo?: HTMLElement | string): HTMLElement {
  let target: HTMLElement
  if (mountTo instanceof HTMLElement) target = mountTo
  else if (typeof mountTo === 'string')
    target = document.querySelector<HTMLElement>(mountTo) ?? document.body
  else target = document.body

  const scopeRoot = anchor.closest<HTMLElement>('[data-flowup-scope]')
  const scope = scopeRoot?.getAttribute('data-flowup-scope')
  if (!scope) throw new Error('Dialog requires an ancestor with data-flowup-scope.')
  const host = document.createElement('div')
  host.setAttribute('data-flowup-scope', scope)
  const theme = scopeRoot?.getAttribute('data-fui-theme')
  if (theme) host.setAttribute('data-fui-theme', theme)
  target.append(host)
  return host
}

export function Dialog(props: DialogProps) {
  const [portalHost, setPortalHost] = createSignal<HTMLElement>()
  let anchor!: HTMLSpanElement
  const escape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.open) props.onClose()
  }
  onMount(() => {
    const host = createScopedPortalHost(anchor, props.mountTo)
    setPortalHost(host)
    window.addEventListener('keydown', escape)
    onCleanup(() => {
      window.removeEventListener('keydown', escape)
      host.remove()
    })
  })
  return (
    <>
      <span ref={element => (anchor = element)} class="hidden" aria-hidden="true" />
      <Show when={portalHost()}>
        {host => (
          <Portal mount={host()}>
            <Show when={props.open}>
              <div
                class="fixed inset-0 z-[99999] flex items-center justify-center bg-black/35 p-5"
                onMouseDown={e => {
                  if (e.target === e.currentTarget) props.onClose()
                }}
              >
                <section
                  role="dialog"
                  aria-modal="true"
                  aria-label={props.title}
                  class={`w-full max-w-[520px] overflow-hidden rounded-(--fui-radius) border border-(--fui-text-subtle) bg-(--fui-surface) shadow-[0_10px_35px_rgba(0,0,0,.28)] ${props.class ?? ''}`}
                >
                  <header class="flex h-(--fui-header-height) items-center border-b border-(--fui-border-soft) bg-(--fui-surface-soft) px-4">
                    <strong class="text-[14px]">{props.title}</strong>
                    <button
                      type="button"
                      aria-label={props.closeLabel ?? 'Close dialog'}
                      onClick={props.onClose}
                      class="ml-auto text-[20px] leading-none text-(--fui-interactive) hover:text-(--fui-text)"
                    >
                      ×
                    </button>
                  </header>
                  <div class="p-5">{props.children}</div>
                  <Show when={props.footer}>
                    <footer class="flex justify-end gap-2 border-t border-(--fui-border-soft) bg-(--fui-surface-soft) px-4 py-3">
                      {props.footer}
                    </footer>
                  </Show>
                </section>
              </div>
            </Show>
          </Portal>
        )}
      </Show>
    </>
  )
}
