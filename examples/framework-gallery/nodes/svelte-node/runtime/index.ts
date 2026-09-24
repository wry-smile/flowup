import type { Node as RedNode, NodeAPI, NodeDef } from 'node-red'
import { NODE_NAME } from '../constant'
import { traceMessage } from '@runtime-shared/trace'

export default function nodeInit(RED: NodeAPI): void {
  function FrameworkGallerySvelteNodeNodeConstructor(this: RedNode, config: FrameworkGallerySvelteNodeNodeDef): void {
    RED.nodes.createNode(this, config as NodeDef)
    const node = this
    const settings = {
      framework: config.framework || 'Svelte',
      mode: config.mode || 'normal',
      enabled: config.enabled !== false,
      price: Number(config.price ?? 12),
      quantity: Number(config.quantity ?? 2),
      items: Array.isArray(config.items) ? [...config.items] : ['Svelte', 'Vue', 'Solid'],
    }

    node.on('input', (msg, send, done) => {
      if (!settings.enabled) {
        node.status({ fill: 'grey', shape: 'ring', text: 'disabled' })
        send(msg)
        done()
        return
      }

      node.status({ fill: 'green', shape: 'dot', text: settings.mode })
      msg.payload = {
        ...traceMessage(msg.payload, settings.framework.toLowerCase()),
        settings: {
          framework: settings.framework,
          mode: settings.mode,
          price: settings.price,
          quantity: settings.quantity,
          total: settings.price * settings.quantity,
          items: [...settings.items],
        },
      }
      send(msg)
      done()
    })

    node.on('close', (done: () => void) => done())
  }

  RED.nodes.registerType<FrameworkGallerySvelteNodeNode, FrameworkGallerySvelteNodeNodeDef, {}, {}>(
    NODE_NAME,
    FrameworkGallerySvelteNodeNodeConstructor,
  )
}
