# 03 - Preact Component Conventions

**Layer**: Embed
**Category**: Architecture, Naming
**Severity**: Error
**Enforcement**: Manual Review, TypeScript compiler (wrong imports cause type errors)
**Related Rules**: rules/embed/01-bundle-constraints.md, rules/embed/02-css-isolation.md

## Rationale

The embed widget uses Preact, not React. Mixing React imports causes the build to pull in both runtimes, bloating the bundle far beyond the 30KB limit. Consistent component conventions also ensure the small codebase stays maintainable without the same tooling the main frontend app has.

## Rule Definition

1. All imports for component primitives MUST come from `preact` or `preact/hooks` — never from `react` or `react-dom`.
2. Components MUST be functional only — no class components.
3. File names MUST use `kebab-case.tsx` (same convention as the frontend).
4. Local state uses `useState` / `useReducer` from `preact/hooks`.
5. Cross-component state uses `@preact/signals` only if native hooks are genuinely insufficient — verify bundle impact against rule 01 first.
6. Data fetching MUST use a shared `useFetch` hook backed by native `fetch` — no inline fetch logic spread across individual components.
7. Use `class` attribute (not `className`) — Preact uses the HTML attribute name.

## Correct Examples

```tsx
// Good: correct Preact imports
// apps/embed/src/App.tsx
import { render } from 'preact'
import { useState, useEffect, useCallback } from 'preact/hooks'
import type { FormSchema } from '@flowform/types'
```

```tsx
// Good: functional component — file named step-view.tsx
// apps/embed/src/step-view.tsx
import { useState } from 'preact/hooks'
import type { FormStep } from '@flowform/types'

interface StepViewProps {
  step: FormStep
  onNext: () => void
  onBack: () => void
  isFirst: boolean
  isLast: boolean
}

export function StepView({ step, onNext, onBack, isFirst, isLast }: StepViewProps) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({})

  return (
    <div class="flowform-step">
      <h2 class="flowform-step__title">{step.title}</h2>
      <div class="flowform-step__nav">
        {!isFirst && (
          <button class="flowform-step__btn" onClick={onBack}>Back</button>
        )}
        <button class="flowform-step__btn flowform-step__btn--primary" onClick={onNext}>
          {isLast ? 'Submit' : 'Next'}
        </button>
      </div>
    </div>
  )
}
```

```tsx
// Good: shared useFetch hook — all data fetching goes through this
// apps/embed/src/hooks/use-fetch.ts
import { useState, useEffect } from 'preact/hooks'

interface FetchState {
  data: unknown
  loading: boolean
  error: string | null
}

export function useFetch(url: string): FetchState {
  const [state, setState] = useState<FetchState>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null })
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ data: null, loading: false, error: err.message })
      })

    return () => { cancelled = true }
  }, [url])

  return state
}
```

```tsx
// Good: use the hook in components, not raw fetch
// apps/embed/src/App.tsx
import { useFetch } from './hooks/use-fetch'
import type { FormSchema } from '@flowform/types'

export function App({ formId, apiUrl }: Props) {
  const { data, loading, error } = useFetch(`${apiUrl}/api/forms/${formId}`)
  const form = data as FormSchema | null

  if (loading) return <div class="flowform-loading">Loading...</div>
  if (error) return <div class="flowform-error">{error}</div>
  if (!form) return null

  return <FormWizard form={form} apiUrl={apiUrl} />
}
```

## Incorrect Examples

```tsx
// Bad: importing from react instead of preact
import { useState, useEffect } from 'react'
import { render } from 'react-dom'
import type { ReactNode } from 'react'
// react + react-dom = ~45KB gzipped, exceeds entire budget
```

```tsx
// Bad: class component
import { Component } from 'preact'

export class StepView extends Component<Props, State> {
  render() {
    return <div>...</div>
  }
}
```

```
// Bad: PascalCase file name in embed (use kebab-case)
apps/embed/src/StepView.tsx   should be   apps/embed/src/step-view.tsx
```

```tsx
// Bad: inline fetch in each component instead of shared hook
export function App({ formId, apiUrl }: Props) {
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Duplicated boilerplate — when another component also fetches,
    // this pattern is copy-pasted, including its bugs
    fetch(`${apiUrl}/api/forms/${formId}`)
      .then((r) => r.json())
      .then((data) => { setForm(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [formId, apiUrl])
}
```

```tsx
// Bad: external state library adds unnecessary bundle weight
import { create } from 'zustand'  // 3KB gzip — use useState for embed-scale state

const useStore = create((set) => ({
  step: 0,
  setStep: (s: number) => set({ step: s }),
}))
```

## Exceptions

- `className` is technically valid in Preact (it maps to `class`), but `class` is preferred for consistency with Preact's HTML-first idiom.
- `@preact/signals` may be added for cross-component state if `useState` prop-drilling becomes untenable AND its gzip footprint still keeps the bundle under 30KB total.

## Cross-Layer Consistency Notes

- The frontend (`apps/web`) uses React, `className`, and Zustand — these conventions deliberately differ from the embed. Do not copy frontend component patterns into the embed without adapting them.
- The shared packages (`@flowform/types`, `@flowform/validators`) are framework-agnostic and safe to import in both layers.
- File naming asymmetry is intentional: frontend uses `PascalCase.tsx` for components; embed uses `kebab-case.tsx` because it follows Vite/vanilla-JS conventions and has no Next.js routing requirements.
