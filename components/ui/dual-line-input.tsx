"use client"

import type React from "react"
import { useState, useEffect } from "react"

interface DualLineInputProps {
  name: string;
  value: string;
  placeholder: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  maxLength?: number;
  className?: string;
}

// 智能分割单字段内容为两行显示
const splitValueToLines = (value: string): [string, string] => {
  if (!value) return ["", ""];
  
  // 如果包含换行符，按换行符分割
  if (value.includes('\n')) {
    const parts = value.split('\n', 2);
    return [parts[0] || "", parts[1] || ""];
  }
  
  // 如果长度超过29字符，智能分割
  const maxCharsPerLine = 28;
  if (value.length <= maxCharsPerLine) {
    return [value, ""];
  }
  
  // 寻找合适的分割点
  let splitIndex = maxCharsPerLine;
  for (let i = maxCharsPerLine; i >= Math.max(0, maxCharsPerLine - 5); i--) {
    const char = value[i];
    const nextChar = value[i + 1];
    
    if (char === ' ') {
      splitIndex = i + 1;
      break;
    }
    
    const punctuation = ['，', '。', '：', ';', ',', ':'];
    if (punctuation.includes(char) && nextChar && punctuation.includes(nextChar)) {
      splitIndex = i + 1;
      break;
    }
  }
  
  return [
    value.substring(0, splitIndex).trim(),
    value.substring(splitIndex).trim()
  ];
};

// 合并两行内容为单字段保存
const mergeLinesToValue = (line1: string, line2: string): string => {
  const trimmed1 = line1.trim();
  const trimmed2 = line2.trim();
  
  if (!trimmed1 && !trimmed2) return "";
  if (!trimmed2) return trimmed1;
  if (!trimmed1) return trimmed2;
  
  return `${trimmed1}\n${trimmed2}`;
};

export function DualLineInput({
  name,
  value,
  placeholder,
  onChange,
  maxLength = 29,
  className = "w-full border-b border-gray-400 focus:outline-none print-empty-hide text-sm"
}: DualLineInputProps) {
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  
  // 当外部 value 变化时，更新内部状态
  useEffect(() => {
    const [newLine1, newLine2] = splitValueToLines(value);
    setLine1(newLine1);
    setLine2(newLine2);
  }, [value]);
  
  // 处理单行输入变化
  const handleLineChange = (lineIndex: 1 | 2, newValue: string) => {
    const updatedLine1 = lineIndex === 1 ? newValue : line1;
    const updatedLine2 = lineIndex === 2 ? newValue : line2;
    
    setLine1(updatedLine1);
    setLine2(updatedLine2);
    
    // 立即合并并触发 onChange
    const mergedValue = mergeLinesToValue(updatedLine1, updatedLine2);
    const syntheticEvent = {
      target: {
        name,
        value: mergedValue
      }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onChange(syntheticEvent);
  };
  
  return (
    <div className="space-y-1">
      <input
        type="text"
        value={line1}
        onChange={(e) => handleLineChange(1, e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={className}
      />
      <input
        type="text"
        value={line2}
        onChange={(e) => handleLineChange(2, e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={className}
      />
    </div>
  )
}