"use client"

import { useEffect, useMemo, useState } from "react"
import {
  projectCardAutomationSetupDraft,
  projectCardAutomationSetupRequirements,
  type CardAutomationSetupChoice,
} from "@/card/automation/setup-projection"
import type { CardChoiceValues } from "@/card/automation/ir-types"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { SheetData } from "@/lib/sheet-data"
import { cn } from "@/lib/utils"
import type {
  SetCardAbilityChoiceValuesInput,
  StoreActionResult,
} from "@/lib/sheet-store"

type SetupDialogStep = "choice" | "confirmSave"

interface DraftFrame {
  choiceValues: CardChoiceValues
  completedChoiceIds: string[]
}

export interface CardAutomationSetupDialogProps {
  open: boolean
  sheetData: SheetData
  cardInstanceId: string | null
  onOpenChange: (open: boolean) => void
  onSaveAbility: (input: SetCardAbilityChoiceValuesInput) => StoreActionResult
}

const emptyFrame = (): DraftFrame => ({
  choiceValues: {},
  completedChoiceIds: [],
})

const isManyChoice = (choice: CardAutomationSetupChoice) =>
  choice.kind === "selectMany" || choice.kind === "targetSelectMany"

const selectedIdsForChoice = (
  choiceValues: CardChoiceValues,
  choiceId: string,
) => choiceValues[choiceId] ?? []

function choiceRuleText(choice: CardAutomationSetupChoice): string {
  if (!isManyChoice(choice)) return "单选"

  const { min, max } = choice.cardinality
  return min === max ? `多选 ${max}` : `多选 ${min}-${max}`
}

function choiceHintText(
  choice: CardAutomationSetupChoice,
  selectedCount: number,
): string {
  if (!isManyChoice(choice)) {
    return "点击一个选项后会自动进入下一步。"
  }

  if (selectedCount < choice.cardinality.min) {
    return `已选 ${selectedCount}/${choice.cardinality.max}，至少选择 ${choice.cardinality.min} 个。`
  }

  return `已选 ${selectedCount}/${choice.cardinality.max}，确认后再进入保存。`
}

function cleanedFrame(
  frame: DraftFrame,
  discardedChoiceIds: string[],
): DraftFrame {
  if (discardedChoiceIds.length === 0) return frame

  const discarded = new Set(discardedChoiceIds)
  const choiceValues: CardChoiceValues = {}
  Object.entries(frame.choiceValues).forEach(([choiceId, selectedIds]) => {
    if (!discarded.has(choiceId)) {
      choiceValues[choiceId] = [...selectedIds]
    }
  })

  return {
    choiceValues,
    completedChoiceIds: frame.completedChoiceIds.filter(
      (choiceId) => !discarded.has(choiceId),
    ),
  }
}

export function CardAutomationSetupDialog({
  open,
  sheetData,
  cardInstanceId,
  onOpenChange,
  onSaveAbility,
}: CardAutomationSetupDialogProps) {
  const [draftFrame, setDraftFrame] = useState<DraftFrame>(() => emptyFrame())
  const [history, setHistory] = useState<DraftFrame[]>([])
  const [step, setStep] = useState<SetupDialogStep>("choice")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAbilityIds, setSavedAbilityIds] = useState<string[]>([])

  useEffect(() => {
    setDraftFrame(emptyFrame())
    setHistory([])
    setStep("choice")
    setSaveError(null)
    setSavedAbilityIds([])
  }, [open, cardInstanceId])

  const requirements = useMemo(() => {
    if (!open || !cardInstanceId) return []
    return projectCardAutomationSetupRequirements(sheetData, { cardInstanceId })
  }, [cardInstanceId, open, sheetData])

  const remainingRequirements = requirements.filter(
    (requirement) => !savedAbilityIds.includes(requirement.abilityId),
  )
  const requirement = remainingRequirements[0]

  const projection = useMemo(() => {
    if (!cardInstanceId || !requirement) {
      return projectCardAutomationSetupDraft(sheetData, {
        cardInstanceId: cardInstanceId ?? "",
        abilityId: "",
        draftChoiceValues: {},
      })
    }

    return projectCardAutomationSetupDraft(sheetData, {
      cardInstanceId,
      abilityId: requirement.abilityId,
      draftChoiceValues: draftFrame.choiceValues,
    })
  }, [cardInstanceId, draftFrame.choiceValues, requirement, sheetData])

  const currentChoice = useMemo(() => {
    if (!projection.requirement) return undefined
    if (projection.activeChoice) return projection.activeChoice

    return projection.requirement.choices.find(
      (choice) =>
        isManyChoice(choice) &&
        choice.status === "valid" &&
        !draftFrame.completedChoiceIds.includes(choice.choiceId),
    )
  }, [draftFrame.completedChoiceIds, projection])

  const resetUnsavedDraft = () => {
    setDraftFrame(emptyFrame())
    setHistory([])
    setStep("choice")
    setSaveError(null)
  }

  const closeDialog = () => {
    resetUnsavedDraft()
    onOpenChange(false)
  }

  const updateDraft = (
    nextChoiceValues: CardChoiceValues,
    nextCompletedChoiceIds: string[],
    shouldAdvance: boolean,
  ) => {
    if (!cardInstanceId || !requirement) return

    const nextProjection = projectCardAutomationSetupDraft(sheetData, {
      cardInstanceId,
      abilityId: requirement.abilityId,
      draftChoiceValues: nextChoiceValues,
    })
    const nextFrame = cleanedFrame(
      {
        choiceValues: nextChoiceValues,
        completedChoiceIds: nextCompletedChoiceIds,
      },
      nextProjection.discardedChoiceIds,
    )
    const cleanedProjection = projectCardAutomationSetupDraft(sheetData, {
      cardInstanceId,
      abilityId: requirement.abilityId,
      draftChoiceValues: nextFrame.choiceValues,
    })

    if (shouldAdvance) {
      setHistory((frames) => [...frames, draftFrame])
    }
    setDraftFrame(nextFrame)
    setSaveError(null)

    if (!shouldAdvance) {
      setStep("choice")
      return
    }

    setStep(cleanedProjection.activeChoice ? "choice" : "confirmSave")
  }

  const selectSingleOption = (choice: CardAutomationSetupChoice, optionId: string) => {
    updateDraft(
      {
        ...draftFrame.choiceValues,
        [choice.choiceId]: [optionId],
      },
      [...new Set([...draftFrame.completedChoiceIds, choice.choiceId])],
      true,
    )
  }

  const toggleManyOption = (
    choice: CardAutomationSetupChoice,
    optionId: string,
    checked: boolean,
  ) => {
    const selected = selectedIdsForChoice(draftFrame.choiceValues, choice.choiceId)
    const nextSelected = checked
      ? [...selected, optionId]
      : selected.filter((selectedId) => selectedId !== optionId)
    const cappedSelected = nextSelected.slice(0, choice.cardinality.max)

    updateDraft(
      {
        ...draftFrame.choiceValues,
        [choice.choiceId]: cappedSelected,
      },
      draftFrame.completedChoiceIds.filter(
        (choiceId) => choiceId !== choice.choiceId,
      ),
      false,
    )
  }

  const finishCurrentChoice = () => {
    if (!currentChoice) return
    updateDraft(
      draftFrame.choiceValues,
      [...new Set([...draftFrame.completedChoiceIds, currentChoice.choiceId])],
      true,
    )
  }

  const goBack = () => {
    const previousFrame = history[history.length - 1]
    if (!previousFrame) return

    setDraftFrame(previousFrame)
    setHistory((frames) => frames.slice(0, -1))
    setStep("choice")
    setSaveError(null)
  }

  const saveCurrentAbility = () => {
    if (!cardInstanceId || !requirement || !projection.canSaveAbility) return

    const result = onSaveAbility({
      cardInstanceId,
      abilityId: requirement.abilityId,
      choiceValues: projection.savableChoiceValues,
    })

    if (result.kind === "failure") {
      setSaveError("保存失败，请重试。")
      return
    }

    if (!hasFollowingRequirement) {
      closeDialog()
      return
    }

    setSavedAbilityIds((abilityIds) => [...abilityIds, requirement.abilityId])
    resetUnsavedDraft()
  }

  const selectedCount = currentChoice
    ? selectedIdsForChoice(draftFrame.choiceValues, currentChoice.choiceId).length
    : 0
  const totalRequirementCount = requirements.length
  const savedRequirementCount = savedAbilityIds.length
  const activeRequirementIndex = requirement
    ? requirements.findIndex(
        (candidate) => candidate.abilityId === requirement.abilityId,
      )
    : -1
  const activeRequirementNumber =
    activeRequirementIndex >= 0 ? activeRequirementIndex + 1 : savedRequirementCount
  const canFinishCurrentChoice =
    currentChoice &&
    isManyChoice(currentChoice) &&
    selectedCount >= currentChoice.cardinality.min
  const isBlocked =
    step === "choice" &&
    currentChoice &&
    currentChoice.options.length === 0 &&
    !projection.canSaveAbility
  const canGoBack = history.length > 0
  const hasFollowingRequirement = remainingRequirements.some(
    (candidate) => candidate.abilityId !== requirement?.abilityId,
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closeDialog()
          return
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="max-h-[min(85vh,40rem)] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b px-5 pb-4 pr-14 pt-5 text-left">
          <div className="min-w-0">
            <DialogTitle>
              {requirement ? requirement.cardName : "配置卡牌自动化"}
            </DialogTitle>
            <DialogDescription className="mt-2 leading-6">
              {requirement
                ? `卡牌自动化 · ${requirement.abilityLabel} · 能力 ${Math.max(activeRequirementNumber, 1)} / ${totalRequirementCount}`
                : "没有待配置的卡牌自动化。"}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(min(85vh,40rem)-8.5rem)] space-y-4 overflow-y-auto px-5 py-5">
          {isBlocked ? (
            <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {currentChoice.emptyOptionsReason ? (
                <p>{currentChoice.emptyOptionsReason}</p>
              ) : null}
              <p>
                {canGoBack
                  ? "可以返回上一步改选其他目标，或关闭后填写经历再重新配置。"
                  : "之后可以在卡组界面尝试重新配置自动化。"}
              </p>
            </div>
          ) : step === "confirmSave" ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              尚未保存。保存后写入角色表；要修改请先返回上一个问题。
            </div>
          ) : currentChoice ? (
            <div className="space-y-3">
              <div>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold">
                    {currentChoice.label ?? currentChoice.choiceId}
                  </h3>
                  <span className="text-xs font-medium text-muted-foreground">
                    {choiceRuleText(currentChoice)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {choiceHintText(currentChoice, selectedCount)}
                </p>
              </div>

              {currentChoice.kind === "selectOne" ? (
                <div className="grid gap-2">
                  {currentChoice.options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      aria-label={option.label}
                      className={cn(
                        "min-h-11 rounded-md border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                        selectedIdsForChoice(
                          draftFrame.choiceValues,
                          currentChoice.choiceId,
                        ).includes(option.id) && "border-gray-700 bg-muted/40",
                      )}
                      onClick={() => selectSingleOption(currentChoice, option.id)}
                    >
                      <span className="font-medium text-foreground">{option.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {currentChoice.options.map((option) => {
                    const selected = selectedIdsForChoice(
                      draftFrame.choiceValues,
                      currentChoice.choiceId,
                    ).includes(option.id)

                    return (
                      <label
                        key={option.id}
                        className={cn(
                          "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted/40",
                          selected && "border-gray-700 bg-muted/40",
                        )}
                      >
                        <Checkbox
                          aria-label={option.label}
                          checked={selected}
                          onCheckedChange={(checked) =>
                            toggleManyOption(
                              currentChoice,
                              option.id,
                              checked === true,
                            )
                          }
                        />
                        <span className="font-medium text-foreground">{option.label}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
              当前无法完成设置
            </div>
          )}

          {saveError ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {saveError}
            </p>
          ) : null}
        </div>

        <DialogFooter className="min-h-[4rem] border-t bg-muted/20 px-5 py-4 sm:justify-between sm:space-x-0">
          <div>
            {canGoBack ? (
              <Button type="button" variant="outline" onClick={goBack}>
                上一步
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {isBlocked ? (
              <Button type="button" onClick={closeDialog}>
                好的
              </Button>
            ) : null}
            {step === "confirmSave" ? (
              <Button
                type="button"
                disabled={!projection.canSaveAbility}
                onClick={saveCurrentAbility}
              >
                {hasFollowingRequirement ? "保存并继续" : "保存并退出"}
              </Button>
            ) : null}
            {step === "choice" && canFinishCurrentChoice ? (
              <Button type="button" onClick={finishCurrentChoice}>
                完成当前选择
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
