import { formatISO } from 'date-fns'
import { nanoid } from 'nanoid'

export function traceMessage<T>(payload: T, framework: string) {
  return { payload, framework, traceId: nanoid(8), receivedAt: formatISO(new Date()) }
}
