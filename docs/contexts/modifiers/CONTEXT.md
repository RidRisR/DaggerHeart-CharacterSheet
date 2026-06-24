# Character Sheet Modifier Context

This context defines the domain language for explaining character-sheet values, modifier sources, automatic calculation, and migration difference behavior.

## Language

**Known Source**:
A character value source whose origin is explicitly represented by a provider, user contribution, or target base.
_Avoid_: provider when referring to the user-facing concept

**Card Instance**:
A card that exists on a character sheet, distinct from the reusable card template it came from.
_Avoid_: template, card definition

**Card Automation IR**:
The normalized, replayable automation definition carried by a Card Instance to derive card-sourced modifier contributions.
_Avoid_: card rule text, template lookup, script

**Card Ability State**:
The persisted per-ability state on a Card Instance, such as activation status and saved choice values.
_Avoid_: global card automation state, UI form state

**Card Automation Requirement**:
A derived request for missing or actionable card automation input before a card ability can contribute reliably.
_Avoid_: UI prompt, validation error

**Card Automation Setup**:
The player-facing flow for responding to a Card Automation Requirement by providing input that may write Card Ability State.
_Avoid_: automation repair, stored setup state, diagnostic

**Card Automation Diagnostic**:
A derived report that explains why card automation can or cannot contribute for the current character sheet.
_Avoid_: stored error state, import diagnostic

**Card-Sourced Contribution**:
A known base or modifier contribution produced from a Card Instance's automation.
_Avoid_: user modifier, equipment modifier

**Loadout Card**:
A Card Instance in the character's active card configuration.
_Avoid_: selected template

**Vault Card**:
A Card Instance stored outside the active loadout but still owned by the character.
_Avoid_: selectable card, installed card

**Character Choice Card**:
A Loadout Card that represents a character creation choice such as class, subclass, ancestry, or community.
_Avoid_: special card, selected template

**Protected Loadout Slot**:
A fixed loadout position reserved for a Character Choice Card and not freely movable through normal card deck actions.
_Avoid_: special slot, card reference

**Reference Total**:
The value calculated from known bases and known modifiers before total-layer adjustments are applied.
_Avoid_: final value, displayed value

**Final Value**:
The actual value stored and shown on the character sheet for a target. In this context, Final Value means Stored Final Value.
_Avoid_: calculated final value, reference total

**Stored Final Value**:
Synonym for Final Value, used only when contrasting with Calculated Final Value. It may be a parseable number, blank, or unparseable text.
_Avoid_: calculated final value

**Calculated Final Value**:
The final value produced by automatic calculation from the current Reference Total plus Other adjustments. It may be absent when no Reference Total exists.
_Avoid_: stored final value, ideal value

**Source State**:
The automatic-calculation inputs that can produce reference and final calculations, including bases, modifiers, Other adjustments, active base state, automatic-calculation state, and modifier target consumption state.
_Avoid_: calculated final value, displayed final value

**Derived State**:
The values recomputed from Source State, especially Reference Total and Calculated Final Value.
_Avoid_: stored value, user input

**Stored State**:
The values actually persisted on the sheet and visible to users, especially Final Value.
_Avoid_: derived state

**Modifier-Aware Behavior**:
A user or system behavior whose meaning can affect Source State, Derived State, or Final Value writeback and therefore must enter the automatic-calculation sync boundary.
_Avoid_: generic sheet data change, raw diff

**Modifier Target Universe**:
The finite set of character-sheet targets that an automatic-calculation sync boundary considers for the current sheet.
_Avoid_: only the target touched by the current action, unlimited theoretical targets

**Other**:
An adjustment that affects a final value but does not belong in the known base or known modifier source lists.
_Avoid_: total, provider contribution

**Other Adjustments**:
The saved collection of Other adjustments, stored separately from user-created modifier contributions.
_Avoid_: user modifier contributions

**Unattributed Difference**:
A system-maintained Other adjustment that explains the gap between a locked final value and the known calculated value. It is derived and unsaved while automatic calculation is off, and may be materialized when automatic calculation is turned back on.
_Avoid_: manual adjustment, unknown migration difference, catch-all difference

**Unknown Migration Difference**:
A total-layer adjustment created during migration to preserve an old saved final value when the old data cannot identify the original source.
_Avoid_: weapon modifier, upgrade modifier

**Manual Final Adjustment**:
A total-layer adjustment created from a user deliberately editing a final value.
_Avoid_: unattributed difference, paused carryover

**Unparseable Final Value**:
A final value that cannot be converted into a number and therefore cannot produce a numeric Other adjustment.
_Avoid_: unknown difference

**Manual Base**:
A user-owned base source created when a user submits a numeric final value for a target that has no current reference base.
_Avoid_: manual final adjustment, hidden final value

**System-Maintained Other**:
An Other adjustment whose value is maintained by system state transitions rather than direct user editing.
_Avoid_: manual adjustment

## Relationships

- A **Reference Total** is calculated from **Known Sources**.
- A **Card Instance** may produce **Card-Sourced Contributions** only through its own **Card Automation IR** and **Card Ability State**.
- A **Card-Sourced Contribution** is a **Known Source**.
- A **Card Automation Requirement** is derived from current **Source State** and does not write **Stored State**.
- **Card Automation Setup** responds to **Card Automation Requirements** and may write **Card Ability State** only through a **Modifier-Aware Behavior**.
- Each committed **Card Automation Setup** write responds to one ability-level **Card Automation Requirement**. A player-facing setup session may process multiple ability-level requirements sequentially.
- A **Card Automation Diagnostic** is derived from current **Source State** and does not write **Stored State**.
- A **Loadout Card** and a **Vault Card** are both **Card Instances**.
- A **Character Choice Card** is a **Loadout Card**.
- A **Protected Loadout Slot** contains at most one **Character Choice Card**.
- A character choice reference identifies a selected template, while the **Character Choice Card** in the matching **Protected Loadout Slot** is the runtime card instance authority.
- A **Calculated Final Value** is calculated from the **Reference Total** plus **Other** adjustments.
- A **Final Value** is the concrete sheet value that users see and edit.
- **Source State** is the input layer for automatic calculation.
- **Derived State** is recalculated from **Source State** and should be reproducible.
- **Stored State** is persisted sheet data and may temporarily differ from **Derived State**.
- A **Modifier-Aware Behavior** must provide behavior context to the automatic-calculation sync boundary. The system must not infer user intent from raw sheet-data diffs alone.
- An automatic-calculation sync boundary is the commit barrier for a **Modifier-Aware Behavior**. Modifier-aware actions may create transient draft states internally, but they must commit only stable post-boundary sheet data to the user-visible store.
- Generic sheet-data writes are not business intent. Modifier-aware UI and business paths must use explicit actions that can enter the automatic-calculation sync boundary.
- **Stored Final Value** is only a clarifying synonym for **Final Value** when contrasting it with **Calculated Final Value**.
- The **Modifier Target Universe** includes fixed built-in targets, the sheet's finite experience slots, and targets referenced by current entries, target state, or Other adjustments. It is broader than the target touched by the current action.
- **Other Adjustments** are stored alongside, not inside, user-created modifier contributions.
- An **Unknown Migration Difference** is an **Other** adjustment.
- A **Manual Final Adjustment** is an **Other** adjustment.
- A **Manual Final Adjustment** is shown as user-owned with label "手动修改终值".
- **Unknown Migration Difference**, **Manual Final Adjustment**, and **Unattributed Difference** may coexist on the same target.
- Each target has at most one saved Other adjustment of each type.
- An **Unparseable Final Value** is preserved as-is and does not create Other adjustments until the user submits a parseable number.
- Only **Final Value** fields may preserve unparseable text. Bases, modifiers, and Other adjustments must be numeric and cannot preserve unparseable values.
- When an **Unparseable Final Value** is later changed by the user to a parseable number, any resulting difference is a **Manual Final Adjustment**.
- Clearing an **Unparseable Final Value** removes the blocking text; it does not create a base or Other adjustment. If automatic calculation is on and a **Reference Total** exists, the **Final Value** is immediately recalculated. If no **Reference Total** exists, the **Final Value** remains blank.
- An **Unattributed Difference** is an **Other** adjustment.
- An **Unattributed Difference** is system-maintained: users do not edit or zero its value directly, and may remove it only after automatic calculation is turned on.
- An **Unattributed Difference** exists and updates only while automatic calculation is off.
- An **Unattributed Difference** is shown with the "同步" badge.
- An **Unattributed Difference** is derived and unsaved while automatic calculation is off; when automatic calculation is turned on, the current non-zero difference is materialized and saved as an Other adjustment.
- Turning automatic calculation on while the **Final Value** is unparseable does not materialize an **Unattributed Difference**, because no numeric gap can be calculated. The unparseable text is preserved until the user clears it or submits a parseable number.
- When automatic calculation is turned off, any materialized **Unattributed Difference** is removed and the target returns to derived unsaved difference behavior.
- While automatic calculation is off, changing an unparseable **Final Value** to a parseable number may make a derived **Unattributed Difference** appear again if a **Reference Total** exists. This derived gap is not saved and is not a **Manual Final Adjustment**.
- When automatic calculation is on, removing an **Other** adjustment immediately recalculates the **Final Value** from the remaining reference and Other adjustments.
- When automatic calculation is off, removing an editable Other adjustment does not rewrite the **Final Value**; any remaining gap is explained by a derived **Unattributed Difference**.
- Other adjustments require a calculable **Reference Total**; when no reference exists, user-entered numeric values use manual base behavior and migration numeric values use estimated base behavior.
- Unknown migration differences and manual final edits are not **Unattributed Difference**; they have their own explicit Other adjustment types.
- Automatic calculation state changes do not rename **Other** adjustments; their cause identity is preserved until the user edits, deletes, or zeros them.
- When automatic calculation is on and a user submits a numeric **Final Value** for a target with no current base, the submitted number becomes a **Manual Base** and the displayed **Final Value** is recalculated from that base plus modifiers and Other adjustments.
- When automatic calculation is on and a user submits a numeric **Final Value** for a target with an existing base, the submitted number creates or updates a **Manual Final Adjustment** so the displayed **Final Value** matches the submitted number.
- A **Final Value** submission is interpreted from the pre-submission stable sheet state plus the submitted value. The system must not first write the submitted value into sheet data and then infer the submission intent from the resulting stored value or a raw diff.
- A blank **Stored Final Value** with an existing base is not a stable automatic-calculation state; when automatic calculation runs, it is filled from the current reference and Other adjustments.
- When automatic calculation is on, a blank user-facing **Stored Final Value** means the target has no calculable **Reference Total**. If a **Reference Total** exists, the blank value is only a transient system state and must not be exposed as user intent.
- If a user-visible store contains a **Reference Total** with a blank or stale enabled **Final Value**, that is a missed sync boundary or legacy escape-hatch repair case, not a normal business state.
- When automatic calculation is on, any path that enters **Final Value** input reconciliation must first operate on a stable synced target state, so the user-facing blank/nonblank value matches whether a **Reference Total** exists.
- At an automatic-calculation sync boundary, the system normalizes **Source State** and derives **Reference Total** and **Calculated Final Value** for the full **Modifier Target Universe**, not only the target that appeared to change. This favors consistency over local incremental updates.
- Automatic-calculation sync boundaries scan all targets, but only targets whose automatic calculation is enabled may have their **Final Value** written back. Targets with automatic calculation off still update their source/reference/active-base state and keep their locked **Final Value**.
- A target with automatic calculation off still persists normalized active base state. The locked state applies to **Final Value**, not to active base selection.
- Target state is retained when it carries business meaning, such as a disabled automatic-calculation preference or a valid active base. Empty target state and stale active-base references are removed during normalization.
- Automatic calculation is enabled by default. `autoCalculation: true` alone is not a meaningful target preference; `autoCalculation: false` is the persisted user preference.
- Submitting a numeric **Final Value** is an automatic-calculation sync boundary. When automatic calculation is on, the system first records the user's intent as a **Manual Base** or **Manual Final Adjustment**, then normalizes and derives the full **Modifier Target Universe** before writing back enabled targets.
- Deleting a base, modifier, or Other adjustment is an automatic-calculation sync boundary. If an active base disappears, the target falls forward to another available base when one exists; otherwise its **Reference Total** disappears and an enabled target's **Final Value** becomes blank.
- Imported legacy data must pass through migration before store replacement. Migration is responsible for creating current-schema providers, bases, target state, and Other adjustments that preserve legacy intent.
- Store replacement is an automatic-calculation sync boundary only for current-schema sheet data. Raw legacy data must not be directly replaced into the store and synced before migration finishes.
- Store replacement may write back enabled **Final Value** fields, but migration must first preserve legacy final values in the current model so replacement sync does not cause unexpected final-value jumps.
- In the short term, store replacement is the high-risk sheet-data write that should be tightened first: it should commit only current-schema, post-boundary stable sheet data. Broader removal of direct sheet-data writes is a longer-term direction.
- During an automatic-calculation sync boundary for an enabled target, an unparseable nonblank **Final Value** prevents writing a new **Final Value** for that target. The sync boundary still occurs; only the final-value writeback is blocked for that target. Disabled targets already keep their locked **Final Value**.
- An **Unparseable Final Value** only blocks **Final Value** writeback. It does not block source changes, reference recalculation, active base fallback, or Other adjustment updates.
- During an automatic-calculation sync boundary, active base selection is normalized. A valid saved active base is preserved; an invalid or missing active base falls forward to another available base; if no base exists, the target has no **Reference Total**.
- Entry state belongs to currently active registry entries. Contributions kept in inactive sources, such as backup weapon slots, retain their source data but do not keep global entry state until they enter the active registry.
- Automatic-calculation sync boundaries should be implemented through one shared boundary function. Store actions must not each invent partial synchronization behavior.
- Automatic-calculation sync boundaries are broad automation transactions: they may interpret a **Modifier-Aware Behavior**, normalize **Source State**, derive **Derived State**, and write back **Stored State**.
- Direct sheet-data writes are low-level escape hatches. They may be useful for unrelated fields, migration, repair, or tests, but they must not become the normal path for changing modifier-aware state.
- Card automation runs inside the automatic-calculation sync boundary. It reads the pre-card boundary snapshot and must not depend on contributions produced in the same boundary run.
- A card template becoming a **Card Instance**, moving a **Card Instance** between loadout and vault, activating a card ability, or changing card choice values is a **Modifier-Aware Behavior** when it can affect card automation.
- A **Card Instance** is the runtime authority for card automation. Current card templates may explain drift or refresh options, but they do not replace the instance's automation unless a modifier-aware refresh behavior explicitly does so.

## Example Dialogue

> **Dev:** "A migrated character has evasion 13, but the known sources only explain 12. Should this become a weapon modifier?"
> **Domain expert:** "No. Preserve it as an **Unknown Migration Difference** in Other, because we do not know whether the old +1 came from a weapon, an upgrade, or a manual edit."

> **Dev:** "Automatic calculation is off, final evasion is 13, and changing equipment makes the reference total 14. Is the new -1 a manual edit?"
> **Domain expert:** "No. It is an **Unattributed Difference**, because it exists only to explain the locked final value while automatic calculation is off."

> **Dev:** "Automatic calculation is on, evasion has a -2 modifier and no base. If the user types final value 5, do we keep final as 5?"
> **Domain expert:** "No. The 5 becomes a **Manual Base**, then the **Final Value** is recalculated to 3."

> **Dev:** "A character was imported on a device without the original card pack. Should an existing card stop contributing?"
> **Domain expert:** "No. The **Card Instance** carries its own **Card Automation IR**. Missing templates can create a **Card Automation Diagnostic**, but they do not remove valid instance-owned contributions."

## Flagged Ambiguities

- "未归因差额" was used as a catch-all; resolved: it now means only the automatic-calculation-off dynamic gap. Migration and manual final edits are separate **Other** adjustments.
- "总计栏" was used for adjustments outside source lists; resolved: total belongs to the title/summary display, while those rows belong to an **Other** section.
- "卡牌自动化" can mean authoring data on a card template, instance-owned automation on a character sheet, or derived modifier contributions. Use **Card Automation IR** for executable instance logic, **Card Ability State** for persisted instance state, and **Card-Sourced Contribution** for calculation output.
- "库存卡组" in existing UI/code maps to **Vault Card** in modifier automation language.
- "特殊卡牌" was used for class, subclass, ancestry, and community loadout slots; resolved: use **Character Choice Card** for the card instance and **Protected Loadout Slot** for the fixed slot.
