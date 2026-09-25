import type { Node as RedNode, NodeAPI, NodeDef } from 'node-red'
import { NODE_NAME } from '../constant'

export default function nodeInit(RED: NodeAPI): void {
  function MqttSubscriberMqttSubscribeNodeConstructor(
    this: RedNode,
    config: MqttSubscriberMqttSubscribeNodeDef,
  ): void {
    RED.nodes.createNode(this, config as NodeDef)
    const node = this
    const settings = {
      productId: config.productId || '',
      organizationId: config.organizationId || '',
      deviceId: config.deviceId || '',
    }

    node.on('input', (msg, send, done) => {
      node.status({
        fill: settings.deviceId ? 'green' : 'grey',
        shape: settings.deviceId ? 'dot' : 'ring',
        text: settings.deviceId || 'not configured',
      })
      const payload = msg.payload && typeof msg.payload === 'object' ? msg.payload : {}
      msg.payload = {
        ...payload,
        productId: settings.productId,
        organizationId: settings.organizationId,
        deviceId: settings.deviceId,
      }
      send(msg)
      done()
    })

    node.on('close', (done: () => void) => done())
  }

  RED.nodes.registerType<
    MqttSubscriberMqttSubscribeNode,
    MqttSubscriberMqttSubscribeNodeDef,
    {},
    {}
  >(NODE_NAME, MqttSubscriberMqttSubscribeNodeConstructor)
}
