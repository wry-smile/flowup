import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import UtilityGallery from '../client/components/UtilityGallery.vue'
import VariantPlayground from '../client/components/VariantPlayground.vue'
import ScopedDialog from '../client/components/ScopedDialog.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('simple-node example components', () => {
  it('renders all metric cards from the gallery', () => {
    const wrapper = mount(UtilityGallery)
    expect(wrapper.findAll('article')).toHaveLength(3)
    expect(wrapper.text()).toContain('1,284')
    expect(wrapper.text()).toContain('99.9%')
  })

  it('toggles the active state and its static utility classes', async () => {
    const wrapper = mount(VariantPlayground)
    const button = wrapper.get('[data-testid="toggle"]')
    expect(button.attributes('aria-pressed')).toBe('false')
    expect(button.classes()).toContain('bg-indigo-600')
    expect(wrapper.get('[data-testid="status"]').text()).toBe('Idle')

    await button.trigger('click')
    expect(button.attributes('aria-pressed')).toBe('true')
    expect(button.classes()).toContain('bg-emerald-600')
    expect(wrapper.get('[data-testid="status"]').text()).toBe('Enabled')
  })

  it('adds the scope attribute to a teleported dialog', async () => {
    const wrapper = mount(ScopedDialog)
    await wrapper.get('[data-testid="open-dialog"]').trigger('click')

    const overlay = document.body.querySelector('[data-testid="dialog-scope"]')
    expect(overlay?.getAttribute('data-flowup-scope')).toBe('simple-node')
    expect(overlay?.querySelector('[role="dialog"]')).not.toBeNull()

    ;(overlay?.querySelector('[data-testid="close-dialog"]') as HTMLButtonElement).click()
    await nextTick()
    expect(document.body.querySelector('[data-testid="dialog-scope"]')).toBeNull()
  })
})
