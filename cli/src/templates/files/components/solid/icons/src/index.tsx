import { Match, Switch } from 'solid-js'

import type { IconProps } from './types'

export function Icon(props: IconProps) {
  const strokeIcon = () =>
    props.name === 'check' ||
    props.name === 'close' ||
    props.name === 'edit' ||
    props.name === 'search'
  const viewBox = () => (props.name === 'spinner' ? '0 0 24 24' : '0 0 20 20')

  return (
    <svg
      class={props.class ?? 'size-4'}
      viewBox={viewBox()}
      fill={strokeIcon() || props.name === 'spinner' ? 'none' : 'currentColor'}
      stroke={strokeIcon() || props.name === 'spinner' ? 'currentColor' : undefined}
      stroke-width={props.name === 'check' ? '2.5' : props.name === 'search' ? '1.7' : '2'}
      aria-hidden="true"
    >
      <Switch>
        <Match when={props.name === 'check'}>
          <path d="m4 10 4 4 8-8" />
        </Match>
        <Match when={props.name === 'chevron-down'}>
          <path d="M5 7l5 6 5-6H5z" />
        </Match>
        <Match when={props.name === 'chevron-right'}>
          <path d="M7 5l6 5-6 5V5z" />
        </Match>
        <Match when={props.name === 'close'}>
          <path d="m5 5 10 10M15 5 5 15" />
        </Match>
        <Match when={props.name === 'edit'}>
          <path d="m13.5 4.5 2 2M4 16l3.5-.8 8.7-8.7a1.4 1.4 0 0 0-2-2l-8.7 8.7L4 16Z" />
        </Match>
        <Match when={props.name === 'search'}>
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path d="m13 13 4 4" />
        </Match>
        <Match when={props.name === 'spinner'}>
          <circle cx="12" cy="12" r="9" stroke-opacity=".25" stroke-width="3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke-width="3" stroke-linecap="round" />
        </Match>
        <Match when={props.name === 'caret-down'}>
          <path d="M10 14l-5-6h10l-5 6z" />
        </Match>
        <Match when={props.name === 'caret-up'}>
          <path d="M10 6l5 6H5l5-6z" />
        </Match>
      </Switch>
    </svg>
  )
}
