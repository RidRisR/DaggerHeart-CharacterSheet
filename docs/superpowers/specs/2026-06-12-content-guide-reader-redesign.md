# Content Guide Reader Redesign

## Context

The existing `/card-pack-guide` page started as a card-pack-only guide. It now also hosts equipment pack authoring material, AI prompts, a card pack example, and the equipment JSON schema. The current stacked-card layout does not scale: every document is rendered on the same page, the sticky nav grows into a button pile, and Markdown headings use heavy colored blocks that make long-form reading noisy.

## Goal

Redesign `/card-pack-guide` into a quiet two-column documentation reader:

- Simple navigation.
- Reliable heading jump behavior.
- One-click download for the current resource.
- Comfortable long-form reading on desktop and mobile.
- Visual language consistent with the project’s existing utility UI.

## Layout

### Desktop

Use a two-column layout:

- Left column: sticky guide navigation.
- Right column: active document reading surface.

The left column contains:

- Back links to content manager, editor, and home.
- Content type switch: card pack / equipment pack.
- Document list for the selected content type.
- Current document table of contents.
- Download current document action.

The right column contains only the active document. It should not stack every guide resource at once. The article surface should use a readable max width around 720-780px.

### Mobile

Use a single-column layout:

- Top compact navigation.
- Content type segmented controls.
- Document selector.
- Article title area with directory and download controls.
- Single-column reading content.

The table of contents should be collapsed by default on mobile and expandable on demand.

## Document Model

Represent guide resources as data, grouped by content type:

- Card pack:
  - User guide Markdown.
  - AI prompt Markdown.
  - Example card pack JSON.
- Equipment pack:
  - User guide Markdown.
  - AI prompt Markdown.
  - Equipment pack schema JSON.

Each resource should define:

- `id`
- `group`
- `label`
- `description`
- `downloadHref`
- `downloadName`
- `kind`: markdown or json
- content string
- optional heading list

## Generated Guide Assets

The equipment pack schema has one editable source:

- `public/schemas/equipment-pack.v1.schema.json`

Guide-directory schema copies and AI-prompt downloads that include the schema are generated artifacts. A build-time script should:

- Copy the canonical schema into `public/自定义装备包指南和示例/equipment-pack.v1.schema.json`.
- Build `public/自定义装备包指南和示例/AI-装备包生成提示词-含Schema.md` from the short source prompt plus a schema appendix.
- Keep the guide page reading experience on the short prompt, but make the download action for the AI equipment prompt point to the generated schema-appended file.
- Run before local development and static export builds so public download links exist without manual copy-paste.

This preserves a single development source for schema changes while allowing exported authoring materials to be packaged differently for creators.

## Markdown Styling

Keep the existing Markdown rendering pipeline, but restyle it for documentation reading:

- Body text: 16px, relaxed line height.
- H1: page title scale, bottom border only when useful.
- H2: clear spacing, moderate font weight, subtle top border or divider.
- H3/H4: text hierarchy only, no colored blocks.
- Tables: horizontal overflow wrapper, readable cell padding.
- Code blocks: scrollable, compact, visually distinct.
- Inline code: subtle neutral background.

Avoid large colored heading blocks and nested card styling.

## Navigation Behavior

- Selecting a document switches the active resource.
- TOC items scroll to the corresponding heading.
- Download action downloads the current resource.
- The current content type and current document are visually selected.
- Mobile TOC can be expanded/collapsed.

No search, filters, animations, or extra preview cards are needed.

## Accessibility and Responsiveness

- Use semantic buttons and links.
- Touch targets should be at least 44px high on mobile.
- Active navigation state should not rely on color alone; use weight and border/background.
- Text should not overflow its containers.
- Main page should avoid horizontal scroll; code blocks and tables may scroll horizontally within themselves.

## Non-Goals

- No three-column layout.
- No marketing hero.
- No search.
- No visual asset generation.
- No behavior changes to card/equipment import logic.
- No tests required for this layout-only pass unless type checking fails.
