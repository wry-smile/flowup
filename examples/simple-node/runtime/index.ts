import type { Node as RedNode, NodeAPI, NodeDef } from 'node-red'
import { NODE_NAME } from '../constant'

export default function nodeInit(RED: NodeAPI): void {
  function SimpleNodeNodeConstructor(this: RedNode, config: SimpleNodeNodeDef): void {
    RED.nodes.createNode(this, config as NodeDef)
    const node = this
    const settings = {
      framework: config.framework || 'Vue',
      mode: config.mode || 'normal',
      enabled: config.enabled !== false,
      price: Number(config.price ?? 12),
      quantity: Number(config.quantity ?? 2),
      items: Array.isArray(config.items) ? [...config.items] : ['Vue', 'Vue', 'Solid'],
    }

    node.on('input', (msg, send, done) => {
      if (!settings.enabled) {
        node.status({ fill: 'grey', shape: 'ring', text: 'disabled' })
        send(msg)
        done()
        return
      }

      node.status({ fill: 'green', shape: 'dot', text: settings.mode })
      const payload = msg.payload && typeof msg.payload === 'object' ? msg.payload : {}
      msg.payload = {
        ...payload,
        framework: settings.framework,
        mode: settings.mode,
        price: settings.price,
        quantity: settings.quantity,
        total: settings.price * settings.quantity,
        items: [...settings.items],
      }
      send(msg)
      done()
    })

    node.on('close', (done: () => void) => done())
  }

  RED.nodes.registerType<SimpleNodeNode, SimpleNodeNodeDef, {}, {}>(
    NODE_NAME,
    SimpleNodeNodeConstructor,
  )
}
