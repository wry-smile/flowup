import { Match, Switch, createSignal } from 'solid-js'

import { InputNumber } from '../../input-number'
import { Select } from '../../select'
import { TextInput } from '../../input'
import { Icon } from '../../icons'
import type { TypedInputProps, TypedInputType, TypedInputValue } from './types'

declare const RED: import('node-red').EditorRED

const typeOptions: { value: TypedInputType; label: string }[] = [
  { value: 'str', label: 'String' },
  { value: 'num', label: 'Number' },
  { value: 'bool', label: 'Boolean' },
  { value: 'json', label: 'JSON' },
  { value: 'msg', label: 'Message' },
  { value: 'flow', label: 'Flow' },
  { value: 'global', label: 'Global' },
  { value: 'env', label: 'Environment' },
]

function formatJson(value: string, space?: number): string {
  try {
    return JSON.stringify(JSON.parse(value), null, space) ?? value
  } catch {
    return value
  }
}

export function TypedInput(props: TypedInputProps) {
  const [localType, setLocalType] = createSignal<TypedInputType>(props.type ?? 'str')
  const [localValue, setLocalValue] = createSignal<TypedInputValue>(props.value ?? '')
  const type = () => props.type ?? localType()
  const value = () => (props.value !== undefined ? props.value : localValue())
  const options = () => {
    const allowed = props.types
    return allowed ? typeOptions.filter(option => allowed.includes(option.value)) : typeOptions
  }

  function update(nextValue: TypedInputValue, nextType = type()) {
    setLocalValue(nextValue)
    props.onChange?.(nextValue, nextType)
  }

  function changeType(nextType: TypedInputType) {
    setLocalType(nextType)
    update(value(), nextType)
  }

  function editJson() {
    RED.editor.editJSON({
      value: formatJson(String(value() ?? ''), 4),
      complete: editedValue => {
        update(formatJson(String(editedValue ?? '')))
      },
    })
  }

  return (
    <div class="flex w-full min-w-0 items-stretch gap-0" data-fui-status={props.status}>
      <div class="w-[132px] shrink-0 [&>div]:h-full [&>div>button]:!h-full [&>div>button]:rounded-l-[3px] [&>div>button]:rounded-r-none [&>div>button]:border-r-0 [&>div>button]:bg-(--fui-surface-muted) [&>div>button>span]:font-mono [&>div>button>span]:text-[12px] [&>div>button>span]:text-(--fui-text-muted)">
        <Select
          options={options()}
          value={type()}
          disabled={props.disabled}
          status={props.status}
          onChange={next => changeType(String(next) as TypedInputType)}
        />
      </div>
      <div class="relative min-w-0 flex-1 [&>div]:rounded-l-none [&>div>button]:rounded-l-none [&>div>div]:rounded-l-none [&>div>input]:rounded-l-none [&>div>span]:rounded-l-none [&>div>textarea]:rounded-l-none">
        <Switch>
          <Match when={type() === 'num'}>
            <InputNumber
              value={typeof value() === 'number' ? (value() as number) : 0}
              disabled={props.disabled}
              status={props.status}
              onChange={next => update(next)}
            />
          </Match>
          <Match when={type() === 'bool'}>
            <Select
              options={[
                { value: true, label: 'True' },
                { value: false, label: 'False' },
              ]}
              value={typeof value() === 'boolean' ? (value() as boolean) : false}
              disabled={props.disabled}
              status={props.status}
              onChange={next => update(Boolean(next))}
            />
          </Match>
          <Match when={type() === 'json'}>
            <>
              <TextInput
                value={String(value() ?? '')}
                placeholder={props.placeholder ?? 'Enter JSON...'}
                disabled={props.disabled}
                status={props.status}
                class="[&>input]:pr-10"
                onInput={event => update(event.currentTarget.value)}
              />
              <button
                type="button"
                aria-label="Edit JSON"
                title="Edit JSON"
                disabled={props.disabled}
                onClick={editJson}
                class="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded text-(--fui-text-muted) hover:bg-(--fui-surface-muted) hover:text-(--fui-interactive) focus-visible:outline-2 focus-visible:outline-(--fui-interactive) disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon name="edit" class="size-4" />
              </button>
            </>
          </Match>
          <Match
            when={type() === 'msg' || type() === 'flow' || type() === 'global' || type() === 'env'}
          >
            <TextInput
              value={String(value() ?? '')}
              placeholder={props.placeholder ?? 'Property name'}
              disabled={props.disabled}
              status={props.status}
              onInput={event => update(event.currentTarget.value)}
            />
          </Match>
          <Match when={true}>
            <TextInput
              value={String(value() ?? '')}
              placeholder={props.placeholder ?? 'Enter a value'}
              disabled={props.disabled}
              status={props.status}
              onInput={event => update(event.currentTarget.value)}
            />
          </Match>
        </Switch>
      </div>
    </div>
  )
}
