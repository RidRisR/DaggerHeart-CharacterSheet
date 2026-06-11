# Equipment Pack Authoring Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add first-draft equipment pack authoring docs and update the existing guide page so it can host both card pack and equipment pack creation resources.

**Architecture:** Keep static authoring content under `public/自定义装备包指南和示例/`. Keep the existing `/card-pack-guide` route for compatibility, but retitle it as a broader content-pack authoring guide and render card/equipment documents as separate sections using the existing Markdown renderer and sticky navigation.

**Tech Stack:** Next.js app route, raw Markdown imports, JSON imports, React components, Vitest/TypeScript validation.

---

### Task 1: Equipment Guide Markdown

**Files:**
- Create: `public/自定义装备包指南和示例/用户指南.md`
- Create: `public/自定义装备包指南和示例/AI-装备包生成提示词.md`
- Create: `public/自定义装备包指南和示例/equipment-pack.v1.schema.json`

- [ ] **Step 1: Create the manual authoring guide**

Write `用户指南.md` as a JSON authoring reference with these sections: scope, format overview, top-level structure, minimal valid pack, weapon templates, armor templates, enum values and Chinese aliases, modifier contributions, ID/versioning practices, validation errors, and schema download/reference links.

- [ ] **Step 2: Create the AI prompt**

Write `AI-装备包生成提示词.md` as a copyable AI conversion prompt with role, task, absolute rules, workflow, weapon mapping, armor mapping, modifier mapping, uncertainty handling, output format, and self-check checklist.

- [ ] **Step 3: Copy the equipment schema**

Copy `public/schemas/equipment-pack.v1.schema.json` to `public/自定义装备包指南和示例/equipment-pack.v1.schema.json` so creators can download the schema from the guide bundle.

### Task 2: Guide Page Integration

**Files:**
- Modify: `app/card-pack-guide/page.tsx`
- Modify: `components/guides/card-pack-guide-nav.tsx`

- [ ] **Step 1: Import equipment guide content**

Import the new Markdown files into `app/card-pack-guide/page.tsx`, generate table-of-contents entries for them, and add download links.

- [ ] **Step 2: Retitle the page**

Update metadata, heading, and intro copy from “高级卡包创作指南” to “内容包创作指南”, while keeping the route `/card-pack-guide`.

- [ ] **Step 3: Render equipment guide sections**

Add articles for equipment user guide, AI prompt, and schema after the card pack sections. Do not render an equipment sample JSON section until the sample content is supplied.

- [ ] **Step 4: Make guide nav handle more items**

Replace the fixed three-column nav layout with a wrapping segmented layout so five guide entries fit on desktop and mobile.

### Task 3: Verification

**Files:**
- Check: `app/card-pack-guide/page.tsx`
- Check: `components/guides/card-pack-guide-nav.tsx`
- Check: `public/自定义装备包指南和示例/*.md`

- [ ] **Step 1: Run focused static checks**

Run `npm run test:run -- tests/unit/guide-content.test.ts` to ensure guide-related test setup still passes.

- [ ] **Step 2: Run TypeScript-aware test pass if needed**

If the focused test does not compile the changed page imports, run a broader `npm run test:run` or `npm run build` depending on time and dependency availability.

- [ ] **Step 3: Review final diff**

Run `git diff --stat` and inspect the changed files for broken links, stale titles, and unintended changes outside guide-related files.
