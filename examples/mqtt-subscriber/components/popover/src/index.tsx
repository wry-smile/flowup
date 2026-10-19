import { Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js'
import { Portal } from 'solid-js/web'
import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom'

import type { PopoverProps } from './types'

export function Popover(props: PopoverProps) {
  const [localOpen, setLocalOpen] = createSignal(props.open ?? false)
  const [portalHost, setPortalHost] = createSignal<HTMLElement>()
  const [panelElement, setPanelElement] = createSignal<HTMLDivElement>()
  let triggerElement!: HTMLButtonElement
  let panel: HTMLDivElement | undefined
  const open = () => props.open ?? localOpen()

  function setOpen(next: boolean) {
    setLocalOpen(next)
    props.onOpenChange?.(next)
  }

  onMount(() => {
    let target: HTMLElement
    if (props.mountTo instanceof HTMLElement) target = props.mountTo
    else if (typeof props.mountTo === 'string')
      target = document.querySelector<HTMLElement>(props.mountTo) ?? document.body
    else target = document.body

    const scopeRoot = triggerElement.closest<HTMLElement>('[data-flowup-scope]')
    const scope = scopeRoot?.getAttribute('data-flowup-scope')
    const host = document.createElement('div')
    if (scope) host.setAttribute('data-flowup-scope', scope)
    const theme = scopeRoot?.getAttribute('data-fui-theme')
    if (theme) host.setAttribute('data-fui-theme', theme)
    target.append(host)
    setPortalHost(host)
    onCleanup(() => host.remove())
  })

  createEffect(() => {
    const floating = panelElement()
    if (!open() || !floating) return
    const update = () => {
      void computePosition(triggerElement, floating, {
        placement: props.placement ?? 'bottom-start',
        strategy: 'fixed',
        middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
      }).then(({ x, y }) => {
        if (floating.isConnected) {
          Object.assign(floating.style, { left: `${x}px`, top: `${y}px`, visibility: 'visible' })
        }
      })
    }
    floating.style.visibility = 'hidden'
    onCleanup(autoUpdate(triggerElement, floating, update))
  })

  onMount(() => {
    const controller = new AbortController()
    document.addEventListener(
      'pointerdown',
      event => {
        const target = event.target as Node
        if (!triggerElement.contains(target) && !panel?.contains(target)) setOpen(false)
      },
      { signal: controller.signal },
    )
    document.addEventListener(
      'keydown',
      event => {
        if (event.key === 'Escape') setOpen(false)
      },
      { signal: controller.signal },
    )
    onCleanup(() => controller.abort())
  })

  return (
    <>
      <button
        ref={triggerElement}
        id={props.id}
        type="button"
        aria-expanded={open()}
        aria-haspopup="dialog"
        aria-controls={props.id ? `${props.id}-popover` : undefined}
        onClick={() => setOpen(!open())}
        class="inline-flex items-center"
      >
        {props.trigger}
      </button>
      <Show when={open() && portalHost()}>
        <Portal mount={portalHost()!}>
          <div
            ref={element => {
              panel = element
              setPanelElement(element)
            }}
            id={props.id ? `${props.id}-popover` : undefined}
            role="dialog"
            class="fixed z-50 w-72 max-w-[calc(100vw-1rem)] rounded-(--fui-radius) border border-(--fui-border) bg-(--fui-surface) p-3 text-(--fui-text) shadow-[0_3px_10px_rgba(0,0,0,.16)]"
          >
            {props.children}
          </div>
        </Portal>
      </Show>
    </>
  )
}
