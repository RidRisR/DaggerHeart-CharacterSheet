# Equipment Pack Authoring Guide Design

## Context

The project already publishes a custom card pack guide under `public/自定义卡包指南和示例/`, with a user-facing guide, an AI generation prompt, and a sample card pack. Equipment packs now have their own public JSON format, editor export flow, import pipeline, and schema at `public/schemas/equipment-pack.v1.schema.json`.

Equipment pack documentation should follow the same public pattern as card packs, but its content should be shaped around equipment-specific authoring concerns: strict JSON schema, enum values, template IDs, armor threshold rules, and modifier contributions.

## Audience

There are two primary audiences:

- Manual JSON authors who are comfortable editing structured JSON directly.
- Creators who use an AI assistant to convert setting notes or equipment lists into valid equipment pack JSON.

The main user guide should assume the reader can edit JSON. It should be an authoring reference, not a zero-programming tutorial. The AI prompt should be a copyable conversion specification that constrains AI output.

## Public Files

Create a new public guide directory:

```text
public/自定义装备包指南和示例/
  用户指南.md
  AI-装备包生成提示词.md
  中文装备包示例.json
  equipment-pack.v1.schema.json
```

The guide directory should include a downloadable schema copy for author convenience. The canonical source schema remains:

```text
public/schemas/equipment-pack.v1.schema.json
```

The sample JSON should use the existing Chinese authoring style. Its exact equipment content will be supplied separately, so the first documentation pass should avoid depending on a final sample payload.

## User Guide Structure

`用户指南.md` should be a concise but complete authoring reference for hand-written JSON.

Recommended sections:

1. **Guide Scope**
   State that this guide is for authors who write equipment pack JSON directly. Point AI-assisted users to `AI-装备包生成提示词.md`.

2. **Format Overview**
   Explain that equipment packs are independent JSON files, not embedded card packs. The required format marker is `daggerheart.equipment-pack.v1`.

3. **Top-Level Structure**
   Document `format`, `name`, `version`, `author`, `description`, and `equipment`. Mention that `version` should use semantic versioning.

4. **Minimal Valid Pack**
   Provide a very small JSON snippet with one weapon or one armor item. This is a structural example only and should not replace the later full Chinese sample.

5. **Weapon Templates**
   Document required and optional weapon fields:
   `id`, `name`, `tier`, `weaponType`, `trait`, `damageType`, `range`, `burden`, `damage`, `featureName`, `description`, and `modifierContributions`.

6. **Armor Templates**
   Document required and optional armor fields:
   `id`, `name`, `tier`, `baseArmorMax`, `baseThresholds.minor`, `baseThresholds.major`, `featureName`, `description`, and `modifierContributions`.
   State the semantic rule that `major` must be greater than or equal to `minor`.

7. **Enum Values and Chinese Aliases**
   Prefer canonical English enum values in examples and reference tables. Also document supported Chinese aliases for author convenience:
   `敏捷`, `力量`, `灵巧`, `本能`, `风度`, `知识`;
   `物理`, `魔法`;
   `近战`, `邻近`, `近距离`, `远距离`, `极远`;
   `单手`, `双手`, `副手`.

8. **Modifier Contributions**
   Explain `modifierContributions` as equipment-provided numeric modifiers that only affect a character after the equipment is selected into a sheet slot. Document `id`, `definition.target`, `definition.kind`, `editable.label`, and `editable.value`.

9. **ID and Versioning Practices**
   Recommend readable IDs such as `包名-作者-weap-装备名` and `包名-作者-armo-装备名`. Explain that equipment template IDs must be unique within the pack and must not conflict with installed or built-in templates.

10. **Validation Rules and Common Errors**
    Cover empty equipment packs, missing fields, unknown fields, invalid enum values, numeric fields written as strings, duplicate IDs, invalid semantic version strings, and reversed armor thresholds.

11. **Schema**
    Link to the downloadable guide copy at `/自定义装备包指南和示例/equipment-pack.v1.schema.json` and mention the canonical project schema at `/schemas/equipment-pack.v1.schema.json`. State that the guide explains authoring intent, while the schema is the final validation contract.

## AI Prompt Structure

`AI-装备包生成提示词.md` should be a copyable prompt for creators using AI-assisted JSON generation.

Recommended sections:

1. **Role**
   Define the AI as a precise DaggerHeart equipment pack JSON conversion engine.

2. **Primary Task**
   Convert user-provided notes, tables, or setting documents into a valid `daggerheart.equipment-pack.v1` JSON equipment pack.

3. **Absolute Rules**
   Require valid JSON, no schema-external fields, valid enums, numeric JSON numbers, unique IDs, non-empty equipment, and explicit reporting of assumptions.

4. **Workflow**
   Read source material, identify weapons and armor, map fields, generate IDs, add modifier contributions, validate against the schema rules, then produce the final JSON.

5. **Weapon Mapping Rules**
   Explain how to map source text to weapon fields, including weapon type, trait, damage type, range, burden, and damage.

6. **Armor Mapping Rules**
   Explain how to map source text to armor fields, including armor slots and thresholds. Require `major >= minor`.

7. **Modifier Mapping Rules**
   Explain how to convert text such as `+1 闪避`, `-1 闪避`, `+1 护甲槽`, or `+1 力量` into `modifierContributions`.

8. **Uncertainty Handling**
   If values are missing or ambiguous, make the smallest reasonable inference only when necessary and list it after the JSON under a clear assumptions section.

9. **Output Format**
   Prefer a complete JSON object first. Any assumptions or warnings must appear outside the JSON so the JSON remains parseable.

10. **Self-Check**
    Include a checklist for format marker, required fields, enum legality, numeric types, duplicate IDs, threshold ordering, and absence of unknown fields.

## Sample Strategy

The sample file should eventually be a themed Chinese-style equipment pack matching the existing custom card pack tone. It should be small enough to read but broad enough to demonstrate:

- Primary weapons.
- Secondary weapons.
- Physical and magic damage.
- Armor thresholds.
- Single modifier contributions.
- Multiple modifier contributions on one item.

The sample content itself is out of scope for this design because it will be supplied separately.

## Non-Goals

- Do not fold equipment packs into the card pack guide.
- Do not document card pack authoring rules in the equipment guide except when contrasting the two formats.
- Do not make the user guide a beginner programming tutorial.
- Do not write the final Chinese sample payload until its content is provided.

## Open Implementation Notes

The documentation pass may include tests only if existing guide-content tests require public guide files to exist or route references to be updated. If adding only static Markdown and JSON sample placeholders, verification can be limited to checking file presence and markdown readability.
