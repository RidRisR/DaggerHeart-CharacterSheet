# Character Sheet Modifier Context

This context defines the domain language for explaining character-sheet values, modifier sources, automatic calculation, and migration difference behavior.

## Language

**Known Source**:
A character value source whose origin is explicitly represented by a provider, user contribution, or target base.
_Avoid_: provider when referring to the user-facing concept

**Reference Total**:
The value calculated from known bases and known modifiers before total-layer adjustments are applied.
_Avoid_: final value, displayed value

**Final Value**:
The value stored and shown on the character sheet for a target.
_Avoid_: reference total

**Other**:
An adjustment that affects a final value but does not belong in the known base or known modifier source lists.
_Avoid_: total, provider contribution

**Other Adjustments**:
The saved collection of Other adjustments, stored separately from user-created modifier contributions.
_Avoid_: user modifier contributions

**Unattributed Difference**:
A system-maintained Other adjustment that exists only while automatic calculation is off to explain the gap between the locked final value and the known calculated value.
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

**System-Maintained Other**:
An Other adjustment whose value is maintained by system state transitions rather than direct user editing.
_Avoid_: manual adjustment

## Relationships

- A **Reference Total** is calculated from **Known Sources**.
- A **Final Value** is calculated from the **Reference Total** plus **Other** adjustments.
- **Other Adjustments** are stored alongside, not inside, user-created modifier contributions.
- An **Unknown Migration Difference** is an **Other** adjustment.
- A **Manual Final Adjustment** is an **Other** adjustment.
- A **Manual Final Adjustment** is shown as user-owned with label "手动修改终值".
- **Unknown Migration Difference**, **Manual Final Adjustment**, and **Unattributed Difference** may coexist on the same target.
- Each target has at most one saved Other adjustment of each type.
- An **Unparseable Final Value** is preserved as-is and does not create Other adjustments until the user submits a parseable number.
- When an **Unparseable Final Value** is later changed by the user to a parseable number, any resulting difference is a **Manual Final Adjustment**.
- An **Unattributed Difference** is an **Other** adjustment.
- An **Unattributed Difference** is system-maintained: users do not edit or zero its value directly, and may remove it only after automatic calculation is turned on.
- An **Unattributed Difference** exists and updates only while automatic calculation is off.
- An **Unattributed Difference** is shown with the "同步" badge.
- An **Unattributed Difference** is derived and unsaved while automatic calculation is off; when automatic calculation is turned on, the current non-zero difference is materialized and saved as an Other adjustment.
- When automatic calculation is turned off, any materialized **Unattributed Difference** is removed and the target returns to derived unsaved difference behavior.
- When automatic calculation is on, removing an **Other** adjustment immediately recalculates the **Final Value** from the remaining reference and Other adjustments.
- When automatic calculation is off, removing an editable Other adjustment does not rewrite the **Final Value**; any remaining gap is explained by a derived **Unattributed Difference**.
- Other adjustments require a calculable **Reference Total**; when no reference exists, user-entered numeric values use manual base behavior and migration numeric values use estimated base behavior.
- Unknown migration differences and manual final edits are not **Unattributed Difference**; they have their own explicit Other adjustment types.
- Automatic calculation state changes do not rename **Other** adjustments; their cause identity is preserved until the user edits, deletes, or zeros them.

## Example Dialogue

> **Dev:** "A migrated character has evasion 13, but the known sources only explain 12. Should this become a weapon modifier?"
> **Domain expert:** "No. Preserve it as an **Unknown Migration Difference** in Other, because we do not know whether the old +1 came from a weapon, an upgrade, or a manual edit."

> **Dev:** "Automatic calculation is off, final evasion is 13, and changing equipment makes the reference total 14. Is the new -1 a manual edit?"
> **Domain expert:** "No. It is an **Unattributed Difference**, because it exists only to explain the locked final value while automatic calculation is off."

## Flagged Ambiguities

- "未归因差额" was used as a catch-all; resolved: it now means only the automatic-calculation-off dynamic gap. Migration and manual final edits are separate **Other** adjustments.
- "总计栏" was used for adjustments outside source lists; resolved: total belongs to the title/summary display, while those rows belong to an **Other** section.
