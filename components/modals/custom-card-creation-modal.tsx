/**
 * 自定义卡牌创建模态框
 * 提供创建单张自定义卡牌的完整界面
 */

import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DynamicFormField, FormFieldValue } from "@/components/ui/dynamic-form";
import { CardDisplaySection } from "@/components/card-display-section";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { showFadeNotification } from "@/components/ui/fade-notification";
import { AlertCircle, Save, X, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

import { CardType, StandardCard } from "@/card/card-types";
import {
    SingleCardManager,
    FormData,
    ValidationResult
} from "@/card/single-card-creation/manager";
import { FieldConfig } from "@/card/single-card-creation/field-configs";

// 卡牌类型选项
const CARD_TYPE_OPTIONS = [
    { value: 'profession', label: '职业卡牌' },
    { value: 'ancestry', label: '血统卡牌' },
    { value: 'community', label: '社群卡牌' },
    { value: 'subclass', label: '子职业卡牌' },
    { value: 'domain', label: '领域卡牌' },
    { value: 'variant', label: '变体卡牌' }
];

interface CustomCardCreationModalProps {
    /** 是否打开模态框 */
    open: boolean;
    /** 关闭模态框回调 */
    onClose: () => void;
    /** 保存卡牌回调 */
    onSave: (card: StandardCard) => void;
    /** 初始卡牌类型（可选） */
    initialCardType?: CardType;
}

/**
 * 自定义卡牌创建模态框组件
 */
export const CustomCardCreationModal: React.FC<CustomCardCreationModalProps> = ({
    open,
    onClose,
    onSave,
    initialCardType
}) => {
    // 状态管理
    const [selectedCardType, setSelectedCardType] = useState<CardType | null>(initialCardType || null);
    const [formData, setFormData] = useState<FormData>({});
    const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([]);
    const [validation, setValidation] = useState<ValidationResult>({ isValid: true, errors: [], fieldErrors: {} });
    const [previewCard, setPreviewCard] = useState<StandardCard | null>(null);
    const [isPreviewMode, setIsPreviewMode] = useState(false);

    // 重置表单
    const resetForm = useCallback(() => {
        setFormData({});
        setPreviewCard(null);
        setValidation({ isValid: true, errors: [], fieldErrors: {} });
    }, []);

    // 卡牌类型变化处理
    useEffect(() => {
        if (selectedCardType) {
            const configs = SingleCardManager.getFieldsForCardType(selectedCardType);
            setFieldConfigs(configs);
            resetForm();
        } else {
            setFieldConfigs([]);
        }
    }, [selectedCardType, resetForm]);

    // 表单数据变化处理
    useEffect(() => {
        if (selectedCardType && Object.keys(formData).length > 0) {
            try {
                const card = SingleCardManager.createStandardCardFromCustomInput(formData, selectedCardType);
                setPreviewCard(card);
            } catch (error) {
                console.warn('Preview generation failed:', error);
                setPreviewCard(null);
            }
        } else {
            setPreviewCard(null);
        }
    }, [formData, selectedCardType]);

    // 字段值变化处理
    const handleFieldChange = useCallback((fieldName: string, value: FormFieldValue) => {
        setFormData(prev => ({
            ...prev,
            [fieldName]: value as string | number | boolean
        }));
    }, []);

    // 验证表单
    const validateForm = useCallback(() => {
        if (!selectedCardType) return false;

        const validationResult = SingleCardManager.validateFormData(formData, selectedCardType);
        setValidation(validationResult);
        return validationResult.isValid;
    }, [formData, selectedCardType]);

    // 保存卡牌
    const handleSave = useCallback(() => {
        if (!selectedCardType) {
            showFadeNotification({
                message: "请选择卡牌类型",
                type: "error"
            });
            return;
        }

        if (validateForm() && previewCard) {
            onSave(previewCard);
            showFadeNotification({
                message: "自定义卡牌创建成功",
                type: "success"
            });
            onClose();
        } else {
            showFadeNotification({
                message: "表单验证失败，请检查必填字段",
                type: "error"
            });
        }
    }, [selectedCardType, validateForm, previewCard, onSave, onClose]);

    // 关闭模态框
    const handleClose = useCallback(() => {
        resetForm();
        setSelectedCardType(initialCardType || null);
        onClose();
    }, [resetForm, initialCardType, onClose]);

    // 切换预览模式
    const togglePreviewMode = useCallback(() => {
        setIsPreviewMode(prev => !prev);
    }, []);

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-7xl max-h-[90vh] p-0">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="text-2xl font-bold">创建自定义卡牌</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col lg:flex-row flex-1 min-h-0">
                    {/* 左侧：表单区域 */}
                    <div className={cn(
                        "flex-1 p-6 border-r lg:border-r border-border",
                        isPreviewMode && "hidden lg:block"
                    )}>
                        <div className="space-y-6">
                            {/* 卡牌类型选择 */}
                            <div className="space-y-2">
                                <Label htmlFor="cardType" className="text-base font-medium">
                                    卡牌类型 <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={selectedCardType || ''}
                                    onValueChange={(value: CardType) => setSelectedCardType(value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="请选择卡牌类型" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CARD_TYPE_OPTIONS.map(option => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* 表单字段 */}
                            {selectedCardType && fieldConfigs.length > 0 && (
                                <>
                                    <Separator />
                                    <ScrollArea className="h-[400px] lg:h-[500px]">
                                        <div className="space-y-4 pr-4">
                                            {fieldConfigs.map((config) => (
                                                <DynamicFormField
                                                    key={config.name}
                                                    config={config}
                                                    value={formData[config.name] || ''}
                                                    onChange={(value) => handleFieldChange(config.name, value)}
                                                    validation={
                                                        validation.fieldErrors[config.name]
                                                            ? { isValid: false, message: validation.fieldErrors[config.name] }
                                                            : { isValid: true }
                                                    }
                                                />
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </>
                            )}

                            {/* 验证错误提示 */}
                            {!validation.isValid && validation.errors.length > 0 && (
                                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertCircle className="h-4 w-4 text-destructive" />
                                        <span className="text-sm font-medium text-destructive">请修正以下错误：</span>
                                    </div>
                                    <ul className="space-y-1 text-sm text-destructive">
                                        {validation.errors.map((error, index) => (
                                            <li key={index}>• {error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 右侧：预览区域 */}
                    <div className={cn(
                        "flex-1 p-6 bg-muted/30",
                        !isPreviewMode && "hidden lg:block"
                    )}>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">实时预览</h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={togglePreviewMode}
                                    className="lg:hidden"
                                >
                                    {isPreviewMode ? <X className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>

                            <ScrollArea className="h-[400px] lg:h-[500px]">
                                {previewCard ? (
                                    <CardDisplaySection cards={[previewCard]} inventoryCards={[]} />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        <div className="text-center">
                                            <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p>填写表单后即可预览卡牌效果</p>
                                        </div>
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    </div>
                </div>

                {/* 底部操作按钮 */}
                <DialogFooter className="p-6 pt-0">
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            onClick={togglePreviewMode}
                            className="lg:hidden"
                        >
                            <Eye className="h-4 w-4 mr-2" />
                            {isPreviewMode ? '返回编辑' : '预览卡牌'}
                        </Button>

                        <Button variant="outline" onClick={handleClose}>
                            取消
                        </Button>

                        <Button
                            onClick={handleSave}
                            disabled={!selectedCardType || !validation.isValid || !previewCard}
                            className="bg-primary hover:bg-primary/90"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            保存卡牌
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
