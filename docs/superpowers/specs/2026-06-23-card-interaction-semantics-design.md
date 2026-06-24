# Card Interaction Semantics Design

Date: 2026-06-23

Status: Design draft for review

## Problem

Card automation now depends on the distinction between a reusable card template and a card instance on a character sheet. Some card operations already respect that distinction, but the character sheet still has paths that mutate card references first and then infer Protected Loadout Slot changes later from sheet data.

The immediate failure case is the built-in ancestry card `Simiah-Nimble` / `灵活`:

- the runtime template carries automation that contributes `evasion +1`;
- selecting the ancestry template must instantiate it so the card instance carries `automation`, `automationSource`, `automationState`, and `instanceId`;
- `handleAncestryChange` currently writes only `ancestry1Ref` or `ancestry2Ref`;
- `syncSpecialCardsWithCharacterChoices` later compares the selected ref with `cards[2]` or `cards[3]`;
- if the ids already match, the sync path treats the slot as correct even when the existing card is a stale template-shaped object without card instance automation fields.

This is not a one-card problem. It shows that card interactions are not fully semantic. The system is still inferring user intent from raw sheet-data differences in places where it should execute explicit modifier-aware card behaviors.

## Goals

- Define the supported card interaction behaviors by user or system intent.
- Ensure every behavior that can affect card automation enters the automatic-calculation sync boundary.
- Keep `SheetCardReference` as a template reference; do not add `instanceId` to refs.
- Make user template selection always instantiate a new card instance, even when replacing a card with the same template id.
- Keep moving an existing card instance distinct from selecting or replacing from a template.
- Convert protected character-choice-card synchronization into load-time card instance audit and explicit player choice, not the normal user-selection path.
- Keep this change scoped to card interaction semantics. Do not reopen Runtime Source Assembly, import commit planning, storage format migration, or broad IR validation.

## Non-Goals

- Do not add `instanceId` to `professionRef`, `subclassRef`, `ancestry1Ref`, `ancestry2Ref`, or `communityRef`.
- Do not auto-refresh all existing card instances from current templates during load.
- Do not preserve old card ability state when the user actively replaces a card from a template or accepts a load-time overwrite update.
- Do not introduce a safe template-refresh-and-state-migration workflow in this phase.
- Do not rewrite the runtime card source registry.
- Do not make React components own card automation or card-instance audit rules.

## Domain Rules

### Template References

Special character choices keep using lightweight template references:

- `professionRef`
- `subclassRef`
- `ancestry1Ref`
- `ancestry2Ref`
- `communityRef`

These refs identify the selected template for display and recovery. They do not identify a card instance.

The instance authority remains the matching Protected Loadout Slot:

| Character choice | Protected Loadout Slot |
| --- | --- |
| `profession` | `cards[0]` |
| `subclass` | `cards[1]` |
| `ancestry1` | `cards[2]` |
| `ancestry2` | `cards[3]` |
| `community` | `cards[4]` |

If a future behavior needs to target a specific card instance, it must use `card.instanceId` from the Character Choice Card, not a character choice ref.

### Template Selection

User selection from a runtime card template always creates a new card instance.

This rule applies to:

- selecting into an empty normal loadout slot;
- replacing a normal loadout slot;
- selecting into an empty vault slot;
- replacing a vault slot;
- selecting or replacing any Character Choice Card;
- replacing a card with another template that has the same `id`.

The old instance does not participate in merge behavior. Its `instanceId`, `automation`, `automationState`, and saved choice values are discarded unless a future explicit safe refresh-and-migrate workflow is designed.

### Moving Existing Instances

Moving a card is not template selection. It moves an existing card instance between zones and preserves:

- `instanceId`;
- instance-owned `automation`;
- `automationSource`;
- `automationState`;
- saved card ability choice values.

Moving Protected Loadout Slots remains disallowed unless a future design changes Character Choice Card ownership.

### Card Instance State Changes

Changing card ability activation or choice values mutates the existing card instance. It must target the instance by `cardInstanceId` and enter the automatic-calculation sync boundary. It must not refresh from the current template.

### Load-Time Card Instance Audit

Load-Time Card Instance Audit is a system behavior for finding saved card instances that do not match the current runtime templates or expected instance shape when a character save enters the active sheet. It is not the normal user-selection path and must not silently change sheet data.

The audit applies to all card instances, including Character Choice Cards, normal Loadout Cards, and Vault Cards.

The audit may report an item when one of these conditions is true:

- saved visible card content differs from the current runtime template, including title, type, class, level, description, or hint;
- a card slot contains a card-like value without `instanceId`;
- the current runtime template has automation but the saved card instance lacks `automation`;
- the saved card instance has automation but lacks `automationState`;
- the saved card instance carries an automation revision different from the current runtime template;
- a Character Choice Card's ref id and Protected Loadout Slot template id disagree.

If the current runtime template cannot be found, the audit does not report that card. The audit is only responsible for comparing saved card instances with known current templates; missing card sources are outside this phase.

The audit must not instantiate templates, clear slots, mutate refs, or write automatic-calculation results by itself. It should produce player-facing pending state for the card-pack update entry when a saved card can be updated from a known current runtime template. The card-pack update dialog is intentionally not a general diagnostics page.

The update decision should default to selecting all audit items while allowing the player to deselect individual items before confirming.

If the player accepts an update, the system performs an explicit overwrite update for the selected audit items. That update is a modifier-aware behavior and must enter the automatic-calculation sync boundary.

This phase does not implement compatibility checking between old `automationState` and the current template IR. Updating from the current template creates a fresh card instance state for the slot and discards the previous card's `automationState`. The UI must describe this per affected card when that card already has filled automation settings. Most cards do not require saved ability choices, so this smaller overwrite-update behavior is acceptable for this phase.

If the player declines or dismisses the dialog, the saved card instances remain unchanged. Existing valid instance-owned automation continues to be the runtime authority even when its revision differs from the current template.

The audit runs when a character save is loaded or replaced into the active sheet, after runtime card sources are queryable, but it must not open a dialog automatically. This phase does not automatically re-run audit when card packs are imported, enabled, disabled, removed, or updated later in the same session. A future explicit "check cards again" action can be designed separately if needed.

## Intended Store Actions

The sheet store should expose semantic actions instead of requiring React components to coordinate refs and Protected Loadout Slots manually.

```ts
type CharacterChoiceCardKind =
  | "profession"
  | "subclass"
  | "ancestry1"
  | "ancestry2"
  | "community"

selectCharacterChoiceCard(
  kind: CharacterChoiceCardKind,
  ref: SheetCardReference,
  template: StandardCard,
): void

clearCharacterChoiceCard(kind: CharacterChoiceCardKind): void

auditCardInstancesOnLoad(
  lookupTemplate: (templateId: string) => StandardCard | undefined,
): CardInstanceAuditReport

overwriteCardInstancesFromAudit(
  auditItems: CardInstanceAuditSelection,
): void
```

`selectCharacterChoiceCard` is the active user-selection path:

1. validate that the template type matches the Character Choice Card kind;
2. update the matching ref and legacy string field;
3. instantiate the template into the fixed Protected Loadout Slot;
4. run the automatic-calculation sync boundary.

`clearCharacterChoiceCard` is the active user-clear path:

1. clear the matching ref and legacy string field;
2. clear the fixed Protected Loadout Slot;
3. run the automatic-calculation sync boundary.

`auditCardInstancesOnLoad` is a read-only load-time path:

1. read all Loadout Cards and Vault Cards;
2. compare each saved card instance with the matching runtime template when available;
3. compare Character Choice Card refs with their Protected Loadout Slots;
4. return a report without mutating sheet data.

The report should be surfaced through a compact card deck header entry and a manually opened card update dialog. Loading or replacing a sheet updates the known pending card-pack update state without opening the dialog. The card deck header shows a help icon when no update items are known, and a warning icon when the last audit found cards that can be updated from the current card pack. Opening the dialog from that entry always refreshes the audit first.

`overwriteCardInstancesFromAudit` is an explicit player-approved update path:

1. accept a selection of items from the report;
2. instantiate each selected current runtime template into the same slot with fresh automation state;
3. update Character Choice Card refs only when the selected update is for a Character Choice Card and the player-approved target requires it;
4. run the automatic-calculation sync boundary.

The card update dialog only shows issues that are solved by overwriting selected saved cards from current card-pack templates:

- card text content differs from the card pack;
- card automation script differs from the card pack;
- the saved card lacks an automation script that exists in the card pack;
- an update will clear that card's filled automation settings, when applicable.

It must not show automation-state setup tasks or Character Choice Card mismatch repair tasks. Those need their own flows if they become product requirements.

Update items should be selected by default in the UI, but the player must be able to exclude individual items before confirmation. The audit does not report unavailable-template items in this phase. Each row should include a card preview affordance that shows the current saved card instance, not a template diff.

`handleProfessionChange` already follows part of this model by updating the profession ref and Protected Loadout Slot through a store action. Ancestry, community, and subclass selection should converge on the same semantic action shape.

## UI Boundary

React components should trigger user intent and close UI affordances. They should not interpret card-instance audit results, card automation completeness, or overwrite-update rules.

Allowed UI responsibilities:

- read selected card id from a modal or picker;
- look up the selected runtime template for display and action input;
- call `selectCharacterChoiceCard`, `clearCharacterChoiceCard`, `updateCard`, `moveCard`, or card ability actions;
- show the card instance audit dialog and capture the player's update decision;
- show errors or disabled states returned by store/application actions.

Avoid in UI:

- writing `ancestryRef` and relying on an effect to later create the card instance;
- comparing card ids to decide whether automation state is current;
- re-instantiating card templates directly;
- coordinating multiple raw `setSheetData` calls for one card behavior.
- silently updating or clearing saved card instances during load.

## Relationship To Existing Actions

Existing automation card actions already encode much of the needed behavior:

- `instantiateCardTemplate` creates a card instance from a template;
- `selectCardIntoSlot` selects a template into a non-protected slot;
- `replaceCardInstance` replaces a non-protected slot from a template;
- `moveCardInstance` moves an existing instance;
- `setProtectedLoadoutCardInstance` writes Protected Loadout Slots from templates.

The next implementation should prefer reusing these actions and adding semantic store actions around them, rather than duplicating card instantiation in components.

The existing public `updateCard(index, card, isInventory)` may remain as a compatibility facade for current UI surfaces, but Character Choice Card UI should move toward explicit `selectCharacterChoiceCard` and `clearCharacterChoiceCard` calls.

## Error Handling

Card interaction actions should fail fast when their inputs do not match the requested behavior:

- selecting an ancestry template into `community` is an action error;
- selecting an unavailable template is an action error;
- moving from an empty slot is an action error;
- deleting or moving a Protected Loadout Slot through generic card actions remains disallowed.

Failures should leave sheet data unchanged unless the action explicitly defines a partial recovery behavior.

## Testing Strategy

Add focused unit tests around store/action behavior before changing UI paths.

Required regression coverage:

- selecting an ancestry Character Choice Card instantiates automation into `cards[2]`;
- selecting the same ancestry id again replaces the old instance with a new instance from the current template;
- a stale same-id ancestry Character Choice Card lacking automation is reported by load-time audit without changing sheet data;
- a stable ancestry Character Choice Card with older automation revision is reported by load-time audit without changing sheet data;
- accepting an audit update overwrites the selected card instance from the current runtime template, clears previous automation choices, and runs automatic calculation;
- declining an audit update leaves the saved instance unchanged;
- normal loadout or vault same-id replacement creates a new instance;
- moving an existing card instance preserves `instanceId` and `automationState`;
- changing card ability choices targets the existing instance and runs automatic calculation;
- clearing a Character Choice Card clears both the ref and the Protected Loadout Slot.

UI tests should cover only the user path wiring: selecting from a picker calls the semantic action and updates visible sheet state. Business rules should remain testable without mounting React.

## Implementation Scope

This design should be implemented as a small follow-up to the Runtime Source Assembly work:

1. add or refine semantic card interaction actions in the sheet store;
2. route Character Choice Card selection UI through those actions;
3. replace automatic protected-slot synchronization with read-only load-time card instance audit plus explicit player-approved overwrite update;
4. preserve existing normal card deck UI behavior while tightening same-id replacement semantics;
5. add regression tests for the `灵活` ancestry-card automation case and the broader interaction semantics.

The work should not modify card import dry-run, commit plan building, built-in runtime source loading, or stored card automation IR validation unless a test proves those layers are directly responsible for a card interaction failure.
