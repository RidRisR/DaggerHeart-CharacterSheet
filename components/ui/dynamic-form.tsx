/**
 * 动态表单字段渲染器
 * 根据字段配置动态渲染不同类型的表单控件
 */

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EditableCombobox } from "@/components/ui/editable-combobox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

import type { 
  FieldConfig, 
  FieldControlType, 
  PredefinedOption 
} from "@/card/single-card-creation/field-configs";

// 表单字段值类型
export type FormFieldValue = string | number | boolean | string[];

// 字段验证结果接口
export interface FieldValidationResult {
  isValid: boolean;
  message?: string;
}

interface DynamicFormFieldProps {
  /** 字段配置 */
  config: FieldConfig;
  /** 当前值 */
  value: FormFieldValue;
  /** 值变化回调 */
  onChange: (value: FormFieldValue) => void;
  /** 验证结果 */
  validation?: FieldValidationResult;
  /** 是否禁用 */
  disabled?: boolean;
  /** 额外的 CSS 类名 */
  className?: string;
}

/**
 * 动态表单字段组件
 */
export const DynamicFormField: React.FC<DynamicFormFieldProps> = ({
  config,
  value,
  onChange,
  validation,
  disabled = false,
  className
}) => {
  const { name, label, type, required, placeholder, predefined } = config;
  
  const fieldId = `field-${name}`;
  const hasError = validation && !validation.isValid;
  
  // 渲染标签
  const renderLabel = () => (
    <Label htmlFor={fieldId} className={cn("text-sm font-medium", required && "after:content-['*'] after:ml-1 after:text-red-500")}>
      {label}
    </Label>
  );
  
  // 渲染错误信息
  const renderError = () => {
    if (!hasError) return null;
    return (
      <span className="text-sm text-red-500 mt-1">
        {validation?.message || "字段验证失败"}
      </span>
    );
  };
  
  // 渲染不同类型的控件
  const renderControl = () => {
    switch (type) {
      case "text":
        return (
          <Input
            id={fieldId}
            type="text"
            value={value as string || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(hasError && "border-red-500")}
          />
        );
        
      case "number":
        return (
          <Input
            id={fieldId}
            type="number"
            value={value as number || ""}
            onChange={(e) => onChange(Number(e.target.value))}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(hasError && "border-red-500")}
          />
        );
        
      case "textarea":
        return (
          <Textarea
            id={fieldId}
            value={value as string || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={cn("min-h-[100px]", hasError && "border-red-500")}
          />
        );
        
      case "select":
        return (
          <Select
            value={value as string || ""}
            onValueChange={onChange}
            disabled={disabled}
          >
            <SelectTrigger className={cn(hasError && "border-red-500")}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {predefined?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
        
      case "combobox":
        return (
          <EditableCombobox
            value={value as string || ""}
            onValueChange={onChange}
            options={predefined || []}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(hasError && "border-red-500")}
          />
        );
        
      default:
        return (
          <div className="text-sm text-gray-500">
            不支持的控件类型: {type}
          </div>
        );
    }
  };
  
  return (
    <div className={cn("space-y-2", className)}>
      {renderLabel()}
      {renderControl()}
      {renderError()}
      {config.description && (
        <p className="text-sm text-gray-500">{config.description}</p>
      )}
    </div>
  );
};

interface DynamicFormProps {
  /** 字段配置列表 */
  configs: FieldConfig[];
  /** 表单数据 */
  formData: Record<string, FormFieldValue>;
  /** 数据变化回调 */
  onChange: (data: Record<string, FormFieldValue>) => void;
  /** 验证结果 */
  validationResults?: Record<string, FieldValidationResult>;
  /** 是否禁用 */
  disabled?: boolean;
  /** 额外的 CSS 类名 */
  className?: string;
}

/**
 * 动态表单组件
 */
export const DynamicForm: React.FC<DynamicFormProps> = ({
  configs,
  formData,
  onChange,
  validationResults,
  disabled = false,
  className
}) => {
  const handleFieldChange = (fieldKey: string, value: FormFieldValue) => {
    onChange({
      ...formData,
      [fieldKey]: value
    });
  };
  
  return (
    <div className={cn("space-y-4", className)}>
      {configs.map((config) => (
        <DynamicFormField
          key={config.name}
          config={config}
          value={formData[config.name]}
          onChange={(value) => handleFieldChange(config.name, value)}
          validation={validationResults?.[config.name]}
          disabled={disabled}
        />
      ))}
    </div>
  );
};
