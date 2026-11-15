import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { installChromeFake, resetChromeFake } from './src/test/chrome-fake'

installChromeFake()

// O jsdom não tem estes recursos, e os componentes do shadcn (Radix) precisam deles.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub
Element.prototype.scrollIntoView ??= () => {}
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}

beforeEach(() => {
  resetChromeFake()
})

afterEach(() => {
  cleanup()
})
