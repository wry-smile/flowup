import type { NodeAPI, NodeDef } from 'node-red'
import { NODE_NAME } from '../constant'
import { traceMessage } from '@runtime-shared/trace'

export default function nodeInit(RED: NodeAPI): void {
  function FrameworkGalleryPreactNodeNodeConstructor(
    this: FrameworkGalleryPreactNodeNode,
    config: FrameworkGalleryPreactNodeNodeDef,
  ): void {
    RED.nodes.createNode(this, config as NodeDef)
    const node = this
    node.on('input', (msg, send, done) => {
      msg.payload = traceMessage(msg.payload, 'preact')
      send(msg)
      done()
    })
    node.on('close', (done: () => void) => {
      done()
    })
  }

  RED.nodes.registerType(NODE_NAME, FrameworkGalleryPreactNodeNodeConstructor)
}
