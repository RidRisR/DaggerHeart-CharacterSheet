import { zhCNMessages } from "./zh-CN"
import { enUSMessages } from "./en-US"
import type { Locale } from "../locales"
import type { MessageDictionary } from "./zh-CN"

export const messages: Record<Locale, MessageDictionary> = {
  "zh-CN": zhCNMessages,
  "en-US": enUSMessages,
}

export type { MessageDictionary }
