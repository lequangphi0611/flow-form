# 02 — CSS Isolation

**Layer**: Embed
**Category**: Architecture, Security
**Severity**: Error
**Enforcement**: Manual Review (code review, visual testing on host pages)
**Related Rules**: [`rules/embed/01-bundle-constraints.md`](./01-bundle-constraints.md), [`rules/embed/03-preact-conventions.md`](./03-preact-conventions.md)

## Rationale

The embed widget runs inside arbitrary host pages with their own CSS. Without isolation, the widget's styles leak into the host page (breaking layouts) and the host page's styles leak into the widget (making it look broken). This creates unpredictable rendering across every customer's website — a critical UX failure. CSS isolation is non-negotiable.

## Rule Definition

All widget styles MUST be scoped so they neither affect the host page nor are affected by the host page's styles.

**Preferred approach — Shadow DOM**: Mount the Preact widget inside a shadow root. Styles inside shadow DOM are fully isolated by the browser.

**Alternative approach — CSS class prefix**: If shadow DOM is not used, every CSS class name MUST be prefixed with `flowform-` using BEM convention: `flowform-[block]__[element]--[modifier]`.

### Absolute prohibitions

- No global CSS resets (`* { box-sizing: border-box }`, `body { margin: 0 }`)
- No bare element selectors outside shadow root (`button { ... }`, `input { ... }`, `h2 { ... }`)
- No Tailwind CSS in the embed — it generates global utility classes that pollute the host page
- No `@import` of external stylesheets into the global scope
- No CSS custom properties defined on `:root` — use them inside `.flowform-widget` or the shadow root `:host` only

## Correct Examples

```tsx
// Good: Shadow DOM mounting (preferred approach)
// apps/embed/src/main.tsx

import { render } from 'preact'
import { App } from './App'
import styles from './widget.css?inline'  // Vite inline import

function mountWithShadow(el: HTMLElement, formId: string, apiUrl: string) {
  // Create shadow root for full CSS isolation
  const shadow = el.attachShadow({ mode: 'open' })

  // Inject scoped styles into the shadow root
  const styleEl = document.createElement('style')
  styleEl.textContent = styles
  shadow.appendChild(styleEl)

  // Mount point inside shadow DOM
  const container = document.createElement('div')
  shadow.appendChild(container)

  render(<App formId={formId} apiUrl={apiUrl} />, container)
}
```

```css
/* Good: styles inside shadow root — no leakage risk */
/* apps/embed/src/widget.css */

/* Safe to use element selectors here — shadow DOM scopes them */
:host {
  display: block;
  font-family: system-ui, sans-serif;
}

button {
  cursor: pointer;
  border: none;
  border-radius: 4px;
}

.progress-bar {
  height: 4px;
  background: #6366f1;
}
```

```css
/* Good: BEM-prefixed classes (alternative if shadow DOM not used) */
/* apps/embed/src/widget.css */

.flowform-widget {
  font-family: system-ui, sans-serif;
  max-width: 600px;
}

.flowform-widget__button {
  cursor: pointer;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
}

.flowform-widget__button--primary {
  background: #6366f1;
  color: white;
}

.flowform-progress {
  height: 4px;
  background: #e5e7eb;
}

.flowform-progress__bar {
  height: 100%;
  background: #6366f1;
  transition: width 0.3s ease;
}
```

```tsx
// Good: BEM class names in component (no Tailwind)
export function App({ formId, apiUrl }: Props) {
  return (
    <div class="flowform-widget">
      <div class="flowform-progress">
        <div class="flowform-progress__bar" style={{ width: `${progress}%` }} />
      </div>
      <button class="flowform-widget__button flowform-widget__button--primary">
        Next
      </button>
    </div>
  )
}
```

## Incorrect Examples

```css
/* Bad: global reset — will break host page layout */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui;
}
```

```css
/* Bad: bare element selectors without shadow DOM */
button {
  /* This targets ALL buttons on the host page */
  background: #6366f1;
  border: none;
}

input {
  /* This targets ALL inputs on the host page */
  border: 1px solid #d1d5db;
}
```

```tsx
// Bad: importing Tailwind in embed
import 'tailwindcss/base.css'
import 'tailwindcss/utilities.css'
```

```tsx
// Bad: CSS class names without flowform- prefix (outside shadow DOM)
export function StepView() {
  return (
    <div class="widget">
      <button class="btn-primary">
        Next
      </button>
    </div>
  )
}
```

```css
/* Bad: defining variables on :root — affects entire host page */
:root {
  --flowform-color: #6366f1;
}
```

```css
/* Good fix: define custom properties inside the widget scope */
.flowform-widget {
  --flowform-color: #6366f1;
}
```

## Exceptions

Inline styles (`style={{ width: '50%' }}`) on individual elements are permitted and do not require the `flowform-` prefix since they are already scoped to the element. Prefer them for dynamic values (e.g., progress bar width) rather than toggling class names.

## Cross-Layer Consistency Notes

- The frontend (`apps/web`) uses Tailwind CSS freely — that is safe because it runs in a dedicated Next.js app, not inside a host page.
- The API has no CSS concerns.
- This rule is embed-only. The distinction exists because the embed widget is the only layer that shares a DOM with untrusted third-party CSS.
