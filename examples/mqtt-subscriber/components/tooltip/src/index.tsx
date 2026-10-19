import { createUniqueId } from 'solid-js'

import type { TooltipProps } from './types'

const placementClass = {
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
  left: 'top-1/2 right-full mr-2 -translate-y-1/2',
  right: 'top-1/2 left-full ml-2 -translate-y-1/2',
} as const

export function Tooltip(props: TooltipProps) {
  const id = createUniqueId()

  return (
    <span class="group relative inline-flex max-w-full">
      <span aria-describedby={id} class="inline-flex max-w-full">
        {props.children}
      </span>
      <span
        id={id}
        role="tooltip"
        class={`pointer-events-none invisible absolute z-50 w-max max-w-[240px] rounded-(--fui-radius) bg-(--fui-text) px-2 py-1 text-[12px] text-(--fui-surface) opacity-0 shadow-md transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 ${placementClass[props.placement ?? 'top']}`}
      >
        {props.content}
      </span>
    </span>
  )
}
