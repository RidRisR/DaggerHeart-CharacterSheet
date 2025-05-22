"use client"

import { useEffect } from "react"

export default function PrintHelper() {
  useEffect(() => {
    // 在打印前处理所有空输入框和占位符
    const handleBeforePrint = () => {
      // 处理所有输入框
      document.querySelectorAll("input, textarea").forEach((element) => {
        const input = element as HTMLInputElement | HTMLTextAreaElement
        // 只处理真正为空的输入框，保留预设值
        if (input.value === "") {
          input.classList.add("print-empty")
          input.style.borderColor = "transparent"
        }

        // 处理所有Max输入框
        if (input.type === "number") {
          input.classList.add("print-empty-text")
        }
      })

      // 处理带有特定类的选择按钮
      document.querySelectorAll("button.print-hide-selection-text").forEach((button) => {
        const btn = button as HTMLButtonElement
        const buttonText = btn.textContent || ""
        if (buttonText.includes("选择武器") || buttonText.includes("选择护甲")) {
          // 保存原始文本以便打印后恢复
          btn.dataset.originalText = buttonText
          // 临时清空按钮文本
          btn.textContent = ""
          // 添加打印样式类
          btn.classList.add("print-empty-button")
        }
      })

      // 处理所有下拉框
      document.querySelectorAll("select").forEach((select) => {
        // 只处理真正为空的下拉框，保留预设值
        if (select.value === "") {
          select.classList.add("print-empty")
          const wrapper = select.closest(".select-wrapper")
          if (wrapper) {
            wrapper.classList.add("print-empty")
          }
        }
      })

      // 处理所有提示文本
      document.querySelectorAll(".print-hide-empty").forEach((element) => {
        element.classList.add("print-hidden")
      })
    }

    // 在打印后恢复
    const handleAfterPrint = () => {
      document.querySelectorAll(".print-empty").forEach((element) => {
        element.classList.remove("print-empty")
        if (element instanceof HTMLElement) {
          element.style.borderColor = ""
        }
      })

      document.querySelectorAll(".print-empty-text").forEach((element) => {
        element.classList.remove("print-empty-text")
      })

      // 恢复按钮原始文本
      document.querySelectorAll("button.print-empty-button").forEach((button) => {
        const btn = button as HTMLButtonElement
        if (btn.dataset.originalText) {
          btn.textContent = btn.dataset.originalText
          delete btn.dataset.originalText
          btn.classList.remove("print-empty-button")
        }
      })

      document.querySelectorAll(".print-hidden").forEach((element) => {
        element.classList.remove("print-hidden")
      })
    }

    window.addEventListener("beforeprint", handleBeforePrint)
    window.addEventListener("afterprint", handleAfterPrint)

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint)
      window.removeEventListener("afterprint", handleAfterPrint)
    }
  }, [])

  return null
}
