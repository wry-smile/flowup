import type { NodeAPI, NodeDef } from "node-red";
import { NODE_NAME } from "../constant";

export default function nodeInit(RED: NodeAPI): void {
  function SimpleNodeNodeConstructor(
    this: SimpleNodeNode,
    config: SimpleNodeNodeDef
  ): void {
    RED.nodes.createNode(this, config as NodeDef);
    const node = this;
    node.on("input", (msg, send, done) => {
      send(msg);
      done();
    });
    node.on("close", (done: () => void) => {
      done();
    });
  }

  RED.nodes.registerType(NODE_NAME, SimpleNodeNodeConstructor);
}
