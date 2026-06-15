# 01 — Bundle Size Constraints

**Layer**: Embed
**Category**: Performance, Architecture
**Severity**: Error
**Enforcement**: Manual Review (Vite build output), CI size check
**Related Rules**: [`rules/embed/03-preact-conventions.md`](./03-preact-conventions.md)

## Rationale

The embed widget is injected as a `<script>` tag into arbitrary third-party websites. Every kilobyte adds to the host page load time. A hard cap of 30KB gzipped ensures the widget is invisible to performance budgets. Violating this limit directly harms the conversion rate of every form owner's website.

## Rule Definition

The entire embed widget bundle — all JS, CSS, and assets combined — MUST NOT exceed **30KB gzipped**. Before adding any new dependency, its gzip footprint must be verified on bundlephobia.com. Forbidden dependencies must never appear in `apps/embed/package.json` regardless of how they are used.

### Forbidden dependencies (hard ban)

| Package | Reason |
|---|---|
| `react`, `react-dom` | Use Preact — saves ~30KB |
| `zustand`, `jotai`, `recoil` | No external state lib — use `useState`/Preact signals |
| `@tanstack/react-query` | Use native `fetch` + `useEffect` |
| `shadcn/ui`, `radix-ui/*` | Use plain HTML + scoped CSS |
| `tailwindcss` | Use CSS modules or inline styles (no purge available in embed context) |
| `axios`, `ky`, `got` | Use native `fetch` |
| `lodash`, `ramda` | Write inline utilities |
| Any NestJS / Node-only package | Embed runs in browser only |

### Allowed state management

- `useState` / `useReducer` from `preact/hooks` — for local component state
- `@preact/signals` — for cross-component state if local state is insufficient (check bundle impact first)
- No other state library is permitted

### Allowed data fetching

- Native `fetch` API only
- Wrap in a custom `useFetch` hook to avoid repeating error/loading logic

## Checking bundle size

After every build, verify the output size:

```bash
# Build from embed directory
cd apps/embed
npm run build

# Check gzipped size of the JS bundle (Linux/macOS)
gzip -c dist/assets/*.js | wc -c

# Or use the --report flag if configured in vite.config.ts
npm run build -- --mode production
```

The Vite build output table already shows raw sizes. Gzip is approximately 30–40% of raw size for typical JS.

Before adding ANY dependency:

```bash
# Check gzip size on bundlephobia before adding
# https://bundlephobia.com/package/<package-name>
# If gzip size > 5KB — seriously reconsider
# If gzip size > 10KB — almost certainly blocked
```

## Correct Examples

```tsx
// Good: native fetch instead of axios
async function loadForm(formId: string, apiUrl: string) {
  const res = await fetch(`${apiUrl}/api/forms/${formId}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
```

```tsx
// Good: inline utility instead of lodash
function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as T
}
```

```tsx
// Good: useState from preact/hooks, not React
import { useState, useEffect } from 'preact/hooks'

export function StepView() {
  const [step, setStep] = useState(0)
  // ...
}
```

```json
// Good: apps/embed/package.json dependencies section
{
  "dependencies": {
    "preact": "^10.x"
  }
}
```

## Incorrect Examples

```bash
# Bad: adding a dependency without checking its size
npm install axios
# axios is ~14KB gzipped — over half the total budget
```

```tsx
// Bad: importing React instead of Preact
import { useState } from 'react'  // react + react-dom = ~45KB gzipped, exceeds entire budget
```

```tsx
// Bad: importing TanStack Query
import { useQuery } from '@tanstack/react-query'  // ~13KB gzipped
```

```json
// Bad: shadcn/ui in embed package.json
{
  "dependencies": {
    "@radix-ui/react-dialog": "^1.x",  // ~12KB gzipped
    "tailwindcss": "^3.x"              // cannot be tree-shaken without purge setup
  }
}
```

```tsx
// Bad: lodash for a simple operation
import { debounce } from 'lodash'  // lodash = ~25KB gzipped even with tree-shaking
```

## Exceptions

None. The 30KB limit is a hard constraint driven by the product's promise to website owners that the widget is lightweight. If a feature genuinely requires a heavier dependency, the feature design must be reconsidered, not the limit.

## Cross-Layer Consistency Notes

- The frontend (`apps/web`) has no bundle size restriction — shadcn/ui, Zustand, TanStack Query are all expected there.
- The API (`apps/api`) is a Node.js server — bundle size is irrelevant.
- This rule is embed-only and has no direct mirror in other layers. However, the shared packages `@flowform/types` and `@flowform/validators` must themselves be tree-shakeable and not pull in heavy transitive dependencies, since the embed imports from them.
