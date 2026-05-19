import { describe, expect, it } from "vitest"
import {
  isValidNumber,
  parseNumberExpressionOr,
  parseNumberOr,
  parseToNumber,
  tryParseNumber,
  tryParseNumberExpression,
} from "@/lib/number-utils"

describe("number utils", () => {
  it("parses pure numbers and rejects expressions", () => {
    expect(tryParseNumber("+2")).toBe(2)
    expect(tryParseNumber("-1")).toBe(-1)
    expect(tryParseNumber("0")).toBe(0)
    expect(tryParseNumber("1.2")).toBe(2)
    expect(tryParseNumber("12+1")).toBeUndefined()
    expect(tryParseNumber("abc")).toBeUndefined()
  })

  it("parses numeric expressions without accepting variables", () => {
    expect(tryParseNumberExpression("+2")).toBe(2)
    expect(tryParseNumberExpression("-1")).toBe(-1)
    expect(tryParseNumberExpression("0")).toBe(0)
    expect(tryParseNumberExpression("12+1")).toBe(13)
    expect(tryParseNumberExpression("2*3")).toBe(6)
    expect(tryParseNumberExpression("(10+2)/2")).toBe(6)
    expect(tryParseNumberExpression("12+敏捷")).toBeUndefined()
    expect(tryParseNumberExpression("abc")).toBeUndefined()
    expect(tryParseNumberExpression("")).toBeUndefined()
  })

  it("returns explicit fallback values", () => {
    expect(parseNumberOr("abc", 7)).toBe(7)
    expect(parseNumberOr("0", 7)).toBe(0)
    expect(parseNumberExpressionOr("abc", 7)).toBe(7)
    expect(parseNumberExpressionOr("12+1", 7)).toBe(13)
  })

  it("preserves compatibility helpers", () => {
    expect(isValidNumber("+2")).toBe(true)
    expect(isValidNumber("12+1")).toBe(false)
    expect(parseToNumber("abc", 1)).toBe(1)
    expect(parseToNumber("1.2", 0)).toBe(2)
  })
})
