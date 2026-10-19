import type { NodeAPI } from 'node-red'
import mqttInNodeInit from './mqtt-in'
import mqttEventNodeInit from './mqtt-event'
import mqttOutNodeInit from './mqtt-out'

export default function nodeInit(RED: NodeAPI): void {
  mqttInNodeInit(RED)
  mqttOutNodeInit(RED)
  mqttEventNodeInit(RED)
}
