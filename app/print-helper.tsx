"use client"

import { useEffect } from "react"

export default function PrintHelper() {
  useEffect(() => {
    const placeholderTexts = ["选择武器", "选择护甲", "选择职业", "选择子职业", "选择血统", "选择社群"];

    const handleBeforePrint = () => {
      // 主要处理按钮的占位符文本，输入框占位符由CSS处理

      // Process all selection buttons with the common class
      document.querySelectorAll("button.printable-selection-button").forEach((button) => {
        const btn = button as HTMLButtonElement;
        const buttonText = btn.textContent?.trim() || "";

        let isPlaceholder = false;
        for (const placeholder of placeholderTexts) {
          if (buttonText === placeholder) { // Exact match for placeholder
            isPlaceholder = true;
            break;
          }
        }

        if (isPlaceholder) {
          // If it's a placeholder, save original text and clear for printing
          btn.dataset.originalText = buttonText;
          btn.textContent = ""; // Clear text
          btn.classList.add("print-placeholder-cleared");
        } else if (btn.classList.contains("header-selection-button")) {
          // If an item is selected AND it's a header-selection-button (affected by globals.css print rule)
          // Force text to be visible by setting inline style
          const originalColor = btn.style.getPropertyValue("color");
          const originalPriority = btn.style.getPropertyPriority("color");
          if (originalColor) {
            btn.dataset.originalInlineColor = originalColor;
            btn.dataset.originalInlineColorPriority = originalPriority;
          }
          btn.style.setProperty("color", "black", "important"); // Force black text
          btn.classList.add("print-text-forced-visible");
        }
        // For non-header-selection-buttons with selected items, no special action is needed here,
        // assuming their default styles allow them to print correctly.
      });

      // Process all select dropdowns
      document.querySelectorAll("select").forEach((select) => {
        if (select.value === "") {
          select.classList.add("print-empty");
          const wrapper = select.closest(".select-wrapper");
          if (wrapper) {
            wrapper.classList.add("print-empty");
          }
        }
      });

      // Hide elements marked with .print-hide-empty
      document.querySelectorAll(".print-hide-empty").forEach((element) => {
        element.classList.add("print-hidden");
      });
    };

    const handleAfterPrint = () => {
      // Restore input fields and textareas
      document.querySelectorAll(".print-empty").forEach((element) => {
        element.classList.remove("print-empty");
        if (element instanceof HTMLElement) {
          element.style.borderColor = "";
        }
      });
      // Note: No need to remove print-empty-text class since we don't add it anymore

      // Restore selection buttons
      document.querySelectorAll("button.printable-selection-button").forEach((button) => {
        const btn = button as HTMLButtonElement;
        if (btn.classList.contains("print-placeholder-cleared")) {
          if (btn.dataset.originalText) {
            btn.textContent = btn.dataset.originalText;
            delete btn.dataset.originalText;
          }
          btn.classList.remove("print-placeholder-cleared");
        }
        if (btn.classList.contains("print-text-forced-visible")) {
          if (btn.dataset.originalInlineColor) {
            btn.style.setProperty("color", btn.dataset.originalInlineColor, btn.dataset.originalInlineColorPriority || "");
            delete btn.dataset.originalInlineColor;
            delete btn.dataset.originalInlineColorPriority;
          } else {
            btn.style.removeProperty("color"); // Remove the override if no original style
          }
          btn.classList.remove("print-text-forced-visible");
        }
      });

      // Restore elements hidden with .print-hide-empty
      document.querySelectorAll(".print-hidden").forEach((element) => {
        element.classList.remove("print-hidden");
      });
    };

    // PDF导出样式切换监听器
    const handlePDFExportStart = () => {
      if (document.body.classList.contains('pdf-exporting')) {
        handleBeforePrint();
      }
    };

    const handlePDFExportEnd = () => {
      if (!document.body.classList.contains('pdf-exporting')) {
        handleAfterPrint();
      }
    };

    // 监听原生打印事件
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    // 监听PDF导出样式类的变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target as HTMLElement;
          if (target === document.body) {
            if (target.classList.contains('pdf-exporting')) {
              // PDF导出开始 - 立即执行，不需要延迟
              handleBeforePrint();
            } else {
              // PDF导出结束
              handleAfterPrint();
            }
          }
        }
      });
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      observer.disconnect();
    };
  }, []);

  return null;
}
