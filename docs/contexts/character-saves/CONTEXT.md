# Character Save Context

This context describes character save lifecycle language: saved character state, runtime sheet state, save switching, autosave, and character-owned image assets.

## Language

**Character Save**:
A user-managed saved character entry with metadata and one current sheet state.
_Avoid_: archive, file, slot

**Stored Sheet State**:
The persisted character sheet data for a **Character Save**.
_Avoid_: raw localStorage payload, save file

**Runtime Sheet State**:
The in-memory sheet data currently used by the character sheet UI.
_Avoid_: form data, current JSON

**Character Image Asset**:
An image owned by a **Character Save**, such as the character portrait or companion image.
_Avoid_: embedded base64 field, picture blob

**Image Reference**:
A small value in **Stored Sheet State** that identifies a **Character Image Asset** without embedding the image payload.
_Avoid_: image data, base64

**Image Asset Map**:
The local-only map of sheet image fields to their **Character Image Asset** metadata.
_Avoid_: external image contract, exported image data

**Character Image Write**:
An explicit action that stores, replaces, or deletes a **Character Image Asset** for a **Character Save**.
_Avoid_: autosave image migration, implicit image save

**Image Asset Migration**:
The asynchronous movement of legacy embedded image payloads into **Character Image Assets** and **Image References**.
_Avoid_: schema migration

**Autosave**:
The automatic persistence of **Runtime Sheet State** into the active **Character Save**.
_Avoid_: direct localStorage write

**Exported Sheet State**:
A portable character sheet payload intended to leave the browser.
_Avoid_: stored sheet state, indexeddb reference payload

**Export Preparation**:
The boundary action that turns local character data into **Exported Sheet State**.
_Avoid_: ad hoc field cleanup in exporters

**Storage Projection**:
The boundary action that turns **Runtime Sheet State** into localStorage-safe **Stored Sheet State**.
_Avoid_: direct JSON.stringify of runtime sheet data

**Character Save Storage Boundary**:
The character-domain boundary that owns **Storage Projection**, **Image Asset Migration**, hydration, and cleanup for **Character Saves**.
_Avoid_: global storage layer, UI persistence logic

**Duplicate Save**:
A new **Character Save** created from an existing **Character Save** as an independent copy.
_Avoid_: linked copy, shared clone

## Relationships

- A **Character Save** has exactly one **Stored Sheet State**.
- A **Character Save** may own zero or more **Character Image Assets**.
- A **Character Image Asset** must be attributable to exactly one **Character Save**.
- A **Duplicate Save** has its own **Stored Sheet State** and its own **Character Image Assets**.
- **Runtime Sheet State** is loaded from **Stored Sheet State** when a **Character Save** becomes active.
- An **Image Asset Map** belongs to local browser storage and must not define the external character file contract.
- A **Character Image Write** changes a **Character Image Asset** and its **Image Reference**.
- **Image Asset Migration** is owned by the character save storage boundary, not by schema migration.
- **Autosave** writes the active **Runtime Sheet State** through the character save storage boundary.
- **Runtime Sheet State** may hydrate **Character Image Assets** as display-ready data URLs.
- **Stored Sheet State** may contain **Image References**, but must not embed **Character Image Assets** after image storage migration.
- **Storage Projection** must run before any `dh_character_*` localStorage write.
- The **Character Save Storage Boundary** is the migration scope; unrelated app storage domains should not be rewritten for this change.
- **Export Preparation** restores portable image payloads and removes local-only **Image Asset Map** data.
- **Exported Sheet State** embeds portable image data and must not expose local **Image References** as the external contract.

## Example Dialogue

> **Dev:** "Can autosave write the active sheet JSON directly to browser storage?"
> **Domain expert:** "No. **Autosave** writes **Runtime Sheet State** through the character save storage boundary so **Character Image Assets** are stored separately from **Stored Sheet State**."

## Flagged Ambiguities

- "存档" can mean the user-visible **Character Save** or the concrete browser storage payload. Resolved: use **Character Save** for the user-managed entry and **Stored Sheet State** for persisted sheet data.
- "图片迁移" can mean moving image display fields or moving image payload storage. Resolved: **Character Image Assets** move out of **Stored Sheet State** while **Runtime Sheet State** still has usable image fields for UI display.
- Image upload was initially discussed as part of autosave. Resolved: user image upload should perform a **Character Image Write**; **Autosave** only prevents embedded image payloads from entering **Stored Sheet State**.
- "复制存档" could mean sharing underlying image assets or creating an independent copy. Resolved: a **Duplicate Save** must own copied **Character Image Assets**, not shared image references.
- Character image cleanup can fail after a **Character Save** is deleted. Resolved: deletion should not be blocked; image records remain attributable to the deleted save and are removable by orphan cleanup.
- Export was ambiguous between local stored shape and portable file shape. Resolved: **Exported Sheet State** restores base64 image data so external JSON/HTML import contracts are not broken.
- Runtime hydration could use object URLs or data URLs. Resolved for the first implementation: hydrate **Runtime Sheet State** with data URLs to preserve existing UI behavior and keep export simple.
- Schema migration and image movement were initially conflated. Resolved: schema migration upgrades synchronous `SheetData` shape; **Image Asset Migration** writes IndexedDB records asynchronously in the character save storage boundary.
- Image references could be stored as per-field ref fields or a central map. Resolved: use an **Image Asset Map** so local image storage metadata stays grouped and external image fields remain stable.
- Export cleanup could be done inside each exporter. Resolved: **Export Preparation** is the single boundary that restores portable images and strips local-only image asset metadata.
