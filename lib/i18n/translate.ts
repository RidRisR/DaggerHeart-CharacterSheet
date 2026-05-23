import { DEFAULT_LOCALE, type Locale } from "./locales"
import { messages, type MessageDictionary } from "./messages"

type MessageNode = string | { [key: string]: MessageNode }
type Params = Record<string, string | number | boolean | null | undefined>

function lookupMessage(dictionary: MessageDictionary, key: string): string | undefined {
  const value = key.split(".").reduce<MessageNode | undefined>((current, segment) => {
    if (!current || typeof current === "string") return undefined
    return current[segment]
  }, dictionary as unknown as MessageNode)

  return typeof value === "string" ? value : undefined
}

export function formatMessage(template: string, params: Params = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, name) => {
    const value = params[name]
    return value === undefined || value === null ? match : String(value)
  })
}

export function t(key: string, params?: Params, locale: Locale = DEFAULT_LOCALE): string {
  const template = lookupMessage(messages[locale], key)
  if (!template) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[i18n] Missing message key "${key}" for locale "${locale}"`)
    }
    return key
  }
  return formatMessage(template, params)
}

function collectShape(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return [prefix]
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix]
  return Object.keys(value as Record<string, unknown>).flatMap((key) =>
    collectShape((value as Record<string, unknown>)[key], prefix ? `${prefix}.${key}` : key),
  )
}

export function hasSameMessageShape(left: MessageDictionary, right: MessageDictionary): boolean {
  const leftShape = collectShape(left).sort()
  const rightShape = collectShape(right).sort()
  return leftShape.length === rightShape.length && leftShape.every((key, index) => key === rightShape[index])
}
