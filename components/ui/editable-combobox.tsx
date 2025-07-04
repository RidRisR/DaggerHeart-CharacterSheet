/**
 * 可输入的组合框组件
 * 支持预设值选择和自定义输入
 */

"use client"

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface EditableComboboxProps {
  options: ComboboxOption[];
  value?: string | string[];
  onValueChange: (value: string | string[]) => void;
  placeholder?: string;
  multiple?: boolean;
  allowCustom?: boolean;
  className?: string;
  disabled?: boolean;
}

export function EditableCombobox({
  options,
  value,
  onValueChange,
  placeholder = "选择或输入...",
  multiple = false,
  allowCustom = true,
  className,
  disabled = false,
}: EditableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const currentValues = multiple 
    ? (Array.isArray(value) ? value : []) 
    : (value ? [value as string] : []);

  // 过滤选项
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 选择预设选项
  const selectOption = (optionValue: string) => {
    if (multiple) {
      const newValues = currentValues.includes(optionValue)
        ? currentValues.filter(v => v !== optionValue)
        : [...currentValues, optionValue];
      onValueChange(newValues);
    } else {
      onValueChange(optionValue);
      setOpen(false);
    }
  };

  // 添加自定义值
  const addCustomValue = () => {
    if (!customInput.trim()) return;
    
    if (multiple) {
      if (!currentValues.includes(customInput.trim())) {
        onValueChange([...currentValues, customInput.trim()]);
      }
    } else {
      onValueChange(customInput.trim());
      setOpen(false);
    }
    setCustomInput('');
  };

  // 移除值
  const removeValue = (valueToRemove: string) => {
    if (multiple) {
      onValueChange(currentValues.filter(v => v !== valueToRemove));
    } else {
      onValueChange('');
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && allowCustom && customInput.trim()) {
      e.preventDefault();
      addCustomValue();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between min-h-10",
            !currentValues.length && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1 overflow-hidden flex-1">
            {currentValues.length === 0 ? (
              placeholder
            ) : multiple ? (
              <>
                {currentValues.slice(0, 2).map((val) => (
                  <Badge key={val} variant="secondary" className="text-xs">
                    {val}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeValue(val);
                      }}
                      className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {currentValues.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{currentValues.length - 2}
                  </Badge>
                )}
              </>
            ) : (
              <span className="truncate">{currentValues[0]}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="max-h-96 overflow-hidden">
          {/* 搜索框 */}
          <div className="flex items-center border-b px-3 py-2">
            <Input
              placeholder="搜索选项..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-8"
            />
          </div>

          {/* 自定义输入框 */}
          {allowCustom && (
            <div className="flex items-center border-b px-3 py-2">
              <Input
                ref={inputRef}
                placeholder="输入自定义值..."
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-8"
              />
              {customInput && (
                <Button
                  size="sm"
                  onClick={addCustomValue}
                  className="ml-2 h-6 px-2"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}

          {/* 选项列表 */}
          <div className="max-h-60 overflow-auto p-1">
            {filteredOptions.map((option) => (
              <div
                key={option.value}
                className={cn(
                  "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer",
                  currentValues.includes(option.value) && "bg-accent"
                )}
                onClick={() => selectOption(option.value)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    currentValues.includes(option.value) ? "opacity-100" : "opacity-0"
                  )}
                />
                {option.label}
              </div>
            ))}
            {filteredOptions.length === 0 && (
              <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                {allowCustom ? "输入自定义值或调整搜索条件" : "未找到选项"}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
