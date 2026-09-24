export function portal(node: HTMLElement) {
  document.body.append(node)
  return {
    destroy() {
      node.remove()
    },
  }
}
