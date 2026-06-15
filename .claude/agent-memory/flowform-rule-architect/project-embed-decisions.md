---
name: embed-architecture-decisions
description: Embed widget architecture decisions: Preact, bundle cap, CSS isolation strategy, public API contract rules
metadata:
  type: project
---

Key decisions established for the embed widget layer (rules/embed/):

**Bundle cap**: 30KB gzipped is a hard limit. No exceptions. Checked after every build.

**Framework**: Preact only (not React). All imports from `preact` or `preact/hooks`. This is the single most important constraint -- React imports would blow past the bundle cap.

**State**: useState/useReducer from preact/hooks for local state. @preact/signals permitted only for genuine cross-component state and only if it fits within the 30KB budget.

**Data fetching**: Single shared `useFetch` hook backed by native `fetch`. No axios, ky, or TanStack Query.

**CSS isolation**: Two approved strategies:
1. Shadow DOM (preferred) -- `el.attachShadow({ mode: 'open' })`
2. BEM with `flowform-` prefix on every class name (alternative)
No global CSS resets, no bare element selectors outside shadow root, no Tailwind.

**File naming**: kebab-case.tsx (intentionally asymmetric with apps/web which uses PascalCase.tsx). Embed follows Vite/vanilla-JS convention.

**Public API surface** (backward compat required):
- `window.FlowForm.init({ formId, target, apiUrl? })` -- never rename `init`
- `window.FlowForm.version` -- must always exist
- `[data-flowform]` + `data-flowform-id` + `data-flowform-api` -- never rename
- Auto-init on DOMContentLoaded -- must never be removed or made opt-in
- New InitOptions must be optional with safe defaults

**Why**: Website owners copy the script tag once and never update it. Breaking changes silently break all existing installations.

**How to apply**: Any change to apps/embed/src/main.tsx that touches the window.FlowForm object or the DOMContentLoaded scan must be reviewed against rule 04.

See [[api-architecture-decisions]] for the API side of the embed-api contract.
