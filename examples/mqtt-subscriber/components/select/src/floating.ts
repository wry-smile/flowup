import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  size,
  type Placement,
} from '@floating-ui/dom'

export type PopupMountTarget = HTMLElement | string

export function createPopupPortalHost(
  anchor: HTMLElement,
  mountTo?: PopupMountTarget,
): HTMLElement {
  let target: HTMLElement
  if (mountTo instanceof HTMLElement) target = mountTo
  else if (typeof mountTo === 'string')
    target = document.querySelector<HTMLElement>(mountTo) ?? document.body
  else target = document.body

  const scopeRoot = anchor.closest<HTMLElement>('[data-flowup-scope]')
  const scope = scopeRoot?.getAttribute('data-flowup-scope')
  if (!scopeRoot || !scope)
    throw new Error('Select popup requires an ancestor with data-flowup-scope.')

  const host = document.createElement('div')
  host.setAttribute('data-flowup-scope', scope)
  const theme = scopeRoot.getAttribute('data-fui-theme')
  if (theme) host.setAttribute('data-fui-theme', theme)
  target.append(host)
  return host
}

export function autoPositionPopup(
  reference: HTMLElement,
  floating: HTMLElement,
  options: { placement?: Placement; matchWidth?: boolean } = {},
): () => void {
  const placement = options.placement ?? 'bottom-start'

  const update = () => {
    void computePosition(reference, floating, {
      placement,
      strategy: 'fixed',
      middleware: [
        offset(4),
        flip({ padding: 8 }),
        shift({ padding: 8 }),
        size({
          padding: 8,
          apply({ availableHeight, availableWidth, elements, rects }) {
            const width = options.matchWidth
              ? Math.min(rects.reference.width, availableWidth)
              : availableWidth
            Object.assign(elements.floating.style, {
              width: `${width}px`,
              maxWidth: `${availableWidth}px`,
              maxHeight: `${availableHeight}px`,
            })
          },
        }),
      ],
    }).then(({ x, y, strategy }) => {
      if (!reference.isConnected || !floating.isConnected) return
      Object.assign(floating.style, {
        position: strategy,
        left: `${x}px`,
        top: `${y}px`,
        visibility: 'visible',
      })
    })
  }

  floating.style.visibility = 'hidden'
  return autoUpdate(reference, floating, update)
}
