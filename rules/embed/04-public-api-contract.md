# 04 - Public API Contract

**Layer**: Embed
**Category**: Architecture, Versioning
**Severity**: Error
**Enforcement**: Manual Review (breaking changes require major version bump)
**Related Rules**: rules/embed/01-bundle-constraints.md, rules/embed/03-preact-conventions.md

## Rationale

Website owners copy a script tag and attribute into their HTML once. They do not update it when we release new versions. If we rename `init`, change the shape of its options, or remove the `data-flowform` attribute behavior, we silently break every existing embed installation. The public API is a contract and backward compatibility must be preserved indefinitely within a major version.

## Rule Definition

The public API surface consists of two integration points:

**1. Programmatic API -- window.FlowForm**

The `window.FlowForm` object MUST always expose at minimum:
- `init(options: InitOptions): void`
- `version: string`

`InitOptions` MUST always accept:
- `formId: string` -- required
- `target: string | HTMLElement` -- required
- `apiUrl?: string` -- optional with a safe default

**2. Declarative API -- data-flowform attribute**

Elements with `[data-flowform]` MUST be auto-initialized on `DOMContentLoaded` (or immediately if the DOM is already loaded). This behavior MUST NOT be removed or made opt-in without a major version bump.

Companion attributes on the target element:
- `data-flowform-id` -- the form ID
- `data-flowform-api` -- optional API URL override

### Backward compatibility rules

- New options on `InitOptions` MUST be optional with safe defaults -- never add a required option.
- Never rename `init` to anything else.
- Never rename `data-flowform`, `data-flowform-id`, or `data-flowform-api`.
- Never change the behavior of an existing option in a breaking way.
- If a breaking change is unavoidable, it requires a major version bump and a migration guide.

## Correct Examples

```tsx
// Good: current public API implementation (apps/embed/src/main.tsx)
import { render } from 'preact'
import { App } from './App'

function mountAll() {
  const elements = document.querySelectorAll('[data-flowform]')
  elements.forEach((el) => {
    const formId = el.dataset.flowformId
    if (!formId) return
    render(<App formId={formId} apiUrl={el.dataset.flowformApi ?? ''} />, el)
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountAll)
} else {
  mountAll()
}

declare global {
  interface Window {
    FlowForm: {
      init: (config: { formId: string; target: string | HTMLElement; apiUrl?: string }) => void
      version: string
    }
  }
}

window.FlowForm = {
  version: '1.0.0',
  init({ formId, target, apiUrl = '' }) {
    const el = typeof target === 'string'
      ? document.querySelector(target)
      : target
    if (!el) return
    render(<App formId={formId} apiUrl={apiUrl} />, el)
  },
}
```

```tsx
// Good: adding a new optional option -- backward compatible
// Before:
//   init({ formId, target, apiUrl = '' }) { ... }
//
// After: adding optional locale -- safe because it has a default
//   init({ formId, target, apiUrl = '', locale = 'en' }) { ... }
//
// Existing callers using init({ formId, target }) still work unchanged
```

```html
<!-- Good: declarative usage in host page HTML -->
<div
  data-flowform
  data-flowform-id="abc123"
  data-flowform-api="https://api.flowform.dev"
></div>
<script src="https://cdn.flowform.dev/embed.js"></script>
```

```html
<!-- Good: programmatic usage in host page HTML -->
<div id="contact-form"></div>
<script src="https://cdn.flowform.dev/embed.js"></script>
<script>
  FlowForm.init({
    formId: 'abc123',
    target: '#contact-form',
    apiUrl: 'https://api.flowform.dev'
  })
</script>
```

## Incorrect Examples

```tsx
// Bad: renaming init -- breaks all programmatic integrations
window.FlowForm = {
  mount({ formId, target }) { ... }
  // Every host page calling FlowForm.init() now silently fails
}
```

```tsx
// Bad: making a previously optional param required
// Before: apiUrl = '' had a default
// After: no default -- host pages that omit apiUrl now get undefined
window.FlowForm = {
  init({ formId, target, apiUrl }) { ... }
}
```

```tsx
// Bad: removing auto-init -- declarative users are silently broken
// Deleting the DOMContentLoaded scan means [data-flowform] elements
// on host pages never mount the widget
```

```html
<!-- Bad: renaming the data attribute breaks existing installs -->
<!-- Old (used by existing customers): data-flowform + data-flowform-id -->
<!-- New (breaks them): data-ff-form="abc123" -->
<div data-ff-form="abc123"></div>
```

```tsx
// Bad: narrowing the type of an existing option
// Before: target accepted string | HTMLElement
// After: target only accepts HTMLElement
window.FlowForm = {
  init({ formId, target }: { formId: string; target: HTMLElement }) { ... }
  // Host pages using target: '#my-form' now fail silently
}
```

## Exceptions

- Non-functional additions to `window.FlowForm` do not require a version bump, for example: adding a `version` property, adding an optional `destroy()` method, or adding a `on(event, handler)` callback system.
- Internal implementation changes (switching CSS isolation strategy, upgrading Preact version, refactoring component structure) are NOT breaking changes as long as the public API surface and visible rendering behavior remain the same.

## Cross-Layer Consistency Notes

- The API layer must not rename fields in the `GET /api/forms/:id` response that the embed widget reads (`form.steps`, `step.title`, `step.fields`) without coordinating with the embed. Such changes break the widget for all existing embed installs.
- The shared type `FormSchema` in `@flowform/types` is used by both the embed and the API response. Changes to fields that the embed renders must be treated as breaking changes to the embed's public contract.
- The frontend (`apps/web`) has its own API interactions for builder and analytics that are independent of the embed's public API.
