import type { CardImportSource } from "./types"

export function createCardObjectSource(value: unknown, label = "object"): CardImportSource {
  return {
    origin: { kind: "object", label },
    async read() {
      return { kind: "parsedObject", value }
    },
  }
}

export function createCardJsonSource(text: string, fileName = "cards.json"): CardImportSource {
  return {
    origin: { kind: "file", fileName },
    async read() {
      return { kind: "jsonText", text, sizeBytes: new TextEncoder().encode(text).byteLength }
    },
  }
}

export function createCardDhcbSource(bytes: ArrayBuffer, fileName = "cards.dhcb"): CardImportSource {
  return {
    origin: { kind: "container", fileName },
    async read() {
      return { kind: "dhcbBytes", bytes, sizeBytes: bytes.byteLength }
    },
  }
}
