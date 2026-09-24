import { Show, createSignal, onCleanup, onMount } from 'solid-js'
import { Portal } from 'solid-js/web'

import type { DrawerProps } from './types'
function createScopedPortalHost(anchor: HTMLElement, mountTo?: HTMLElement | string): HTMLElement {
  let target: HTMLElement
  if (mountTo instanceof HTMLElement) target = mountTo
  else if (typeof mountTo === 'string')
    target = document.querySelector<HTMLElement>(mountTo) ?? document.body
  else target = document.body

  const scopeRoot = anchor.closest<HTMLElement>('[data-flowup-scope]')
  const scope = scopeRoot?.getAttribute('data-flowup-scope')
  if (!scope) throw new Error('Drawer requires an ancestor with data-flowup-scope.')
  const host = document.createElement('div')
  host.setAttribute('data-flowup-scope', scope)
  const theme = scopeRoot?.getAttribute('data-fui-theme')
  if (theme) host.setAttribute('data-fui-theme', theme)
  target.append(host)
  return host
}

export function Drawer(props: DrawerProps) {
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
                class="fixed inset-0 z-[99999] bg-black/35"
                onMouseDown={e => {
                  if (e.target === e.currentTarget) props.onClose()
                }}
              >
                <aside
                  role="dialog"
                  aria-modal="true"
                  aria-label={props.title}
                  class={`absolute inset-y-0 right-0 flex w-full max-w-[480px] flex-col border-l border-(--fui-text-subtle) bg-(--fui-surface) shadow-[-8px_0_30px_rgba(0,0,0,.2)] ${props.class ?? ''}`}
                >
                  <header class="flex h-(--fui-header-height) shrink-0 items-center border-b border-(--fui-border-soft) bg-(--fui-surface-soft) px-4">
                    <strong class="text-[14px]">{props.title}</strong>
                    <button
                      type="button"
                      aria-label={props.closeLabel ?? 'Close drawer'}
                      onClick={props.onClose}
                      class="ml-auto text-[20px] leading-none text-(--fui-interactive) hover:text-(--fui-text)"
                    >
                      ×
                    </button>
                  </header>
                  <div class="min-h-0 flex-1 overflow-auto p-5">{props.children}</div>
                  <Show when={props.footer}>
                    <footer class="flex shrink-0 justify-end gap-2 border-t border-(--fui-border-soft) bg-(--fui-surface-soft) px-4 py-3">
                      {props.footer}
                    </footer>
                  </Show>
                </aside>
              </div>
            </Show>
          </Portal>
        )}
      </Show>
    </>
  )
}
