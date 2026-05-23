import { zhCNMessages } from "./zh-CN"
import { enUSMessages } from "./en-US"
import type { Locale } from "../locales"

export type MessageDictionary = typeof zhCNMessages

export const messages: Record<Locale, MessageDictionary> = {
  "zh-CN": zhCNMessages,
  "en-US": enUSMessages,
}
