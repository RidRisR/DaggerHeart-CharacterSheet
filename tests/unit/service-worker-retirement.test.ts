// @vitest-environment node
import { readFileSync } from "node:fs"
import vm from "node:vm"
import { describe, expect, it, vi } from "vitest"

function loadWorker() {
  const listeners = new Map<string, (event: { waitUntil: (work: Promise<unknown>) => void }) => void>()
  const self = {
    addEventListener: (type: string, listener: (event: { waitUntil: (work: Promise<unknown>) => void }) => void) => {
      listeners.set(type, listener)
    },
    skipWaiting: vi.fn().mockResolvedValue(undefined),
    clients: { claim: vi.fn().mockResolvedValue(undefined), matchAll: vi.fn() },
    registration: { unregister: vi.fn().mockResolvedValue(true) },
  }
  vm.runInNewContext(readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8"), { self })
  const dispatch = async (type: string) => {
    const work: Promise<unknown>[] = []
    listeners.get(type)?.({ waitUntil: (promise) => { work.push(promise) } })
    await Promise.all(work)
  }
  return { self, listeners, dispatch }
}

describe("legacy service worker retirement", () => {
  it("replaces the old worker and unregisters without messaging or navigating open tabs", async () => {
    const { self, dispatch } = loadWorker()
    await dispatch("install")
    expect(self.skipWaiting).toHaveBeenCalledOnce()
    await dispatch("activate")
    expect(self.clients.claim).toHaveBeenCalledOnce()
    expect(self.registration.unregister).toHaveBeenCalledOnce()
    expect(self.clients.claim.mock.invocationCallOrder[0]).toBeLessThan(
      self.registration.unregister.mock.invocationCallOrder[0],
    )
    expect(self.clients.matchAll).not.toHaveBeenCalled()
  })

  it("leaves document and asset requests to the browser", () => {
    const { listeners } = loadWorker()
    expect(listeners.has("fetch")).toBe(false)
  })
})
