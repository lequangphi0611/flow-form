# Spec kỹ thuật — US-004: Form Builder

> Audience: Developer triển khai US-004  
> Sprint: 1 · Story points: 8 · Priority: Must Have

---

## 1. Tổng quan

US-004 xây dựng Builder — màn hình tạo và chỉnh sửa form theo kiểu kéo thả. Người dùng quản lý steps và fields, tất cả thay đổi được auto-save về server.

### Trong scope Sprint 1

- Quản lý steps: thêm, xóa, đổi tên inline, kéo thả sắp xếp
- Quản lý fields: thêm 9 loại, đặt label + required, xóa, kéo thả trong step
- Auto-save debounced sau mỗi thay đổi

### Ngoài scope Sprint 1

- Kéo thả field giữa 2 steps khác nhau (cross-step drag)
- Placeholder text và help text cho field
- Logic điều kiện (if/then rules)
- Theme editor

---

## 2. Kiến trúc tổng thể

```
packages/types        — FormSchema, StepSchema, FieldSchema, FieldType (đã có)
packages/validators   — updateFormSchema, formBodySchema (đã có)
apps/api              — PATCH /api/forms/:id (đã có, không cần sửa)
apps/web              — Builder page + components + store + hooks (PHẦN CẦN LÀM)
```

API và shared packages đã sẵn sàng. Toàn bộ công việc Sprint 1 nằm ở `apps/web`.

---

## 3. Shared Types — Xác nhận đủ

File [`packages/types/src/form.ts`](../../packages/types/src/form.ts) đã có đủ:

| Type | Trạng thái |
|---|---|
| `FieldType` | Có sẵn — dùng subset Sprint 1 (xem bảng bên dưới) |
| `FieldSchema` | Có sẵn |
| `StepSchema` | Có sẵn |
| `FormSchema` | Có sẵn |

### Field types Sprint 1 — mapping sang `FieldType`

| Tên hiển thị | `FieldType` value | Ghi chú |
|---|---|---|
| Text | `text` | |
| Email | `email` | |
| Number | `number` | |
| Date | `date` | |
| Textarea | `textarea` | |
| Dropdown | `select` | `options[]` bắt buộc |
| Multi-select | `multiselect` | `options[]` bắt buộc |
| Rating | `rating` | 1–5 sao, không cần `options` |
| Yes/No | `radio` | Fixed options `['Có', 'Không']`, không cho edit options |

`file`, `signature`, `phone`, `checkbox` — **không dùng** trong Sprint 1, không hiển thị trong field picker.

---

## 4. API Layer — Đã sẵn sàng

Endpoint [`PATCH /api/forms/:id`](../../apps/api/src/modules/forms/forms.controller.ts#L58) đã implement đầy đủ:

- `AuthGuard` + `FormOwnerGuard` — chỉ owner được cập nhật
- Body validate bằng `updateFormSchema` (Zod)
- Nhận `{ schema: { steps: [...] } }` — partial update

**Không cần sửa API.** Builder web chỉ cần gọi `PATCH /api/forms/:id` với payload đúng format.

Endpoint load form vào Builder: [`GET /api/forms/:id/editor`](../../apps/api/src/modules/forms/forms.controller.ts#L52) — trả về full form data kể cả schema.

---

## 5. Zustand Store — Đã sẵn sàng

File [`apps/web/src/store/builder.store.ts`](../../apps/web/src/store/builder.store.ts) đã có đầy đủ actions:

| Action | Mô tả |
|---|---|
| `setForm(form)` | Khởi tạo store từ API response |
| `selectStep(stepId)` | Track step đang active |
| `selectField(fieldId)` | Track field đang được chọn để edit |
| `addStep()` | Thêm step mới ở cuối |
| `removeStep(stepId)` | Xóa step (guard ở UI layer) |
| `updateStep(stepId, updates)` | Đổi tên step |
| `reorderSteps(from, to)` | Kéo thả sắp xếp steps |
| `addField(stepId, type)` | Thêm field vào step |
| `removeField(stepId, fieldId)` | Xóa field |
| `updateField(stepId, fieldId, updates)` | Cập nhật field (label, required, options) |
| `reorderFields(stepId, from, to)` | Kéo thả sắp xếp fields trong step |

**Không cần sửa store.** Chỉ cần consume trong components.

---

## 6. Web Layer — Components cần xây dựng

### 6.1 Layout & Route

Route đã có: [`apps/web/src/app/(builder)/forms/[id]/builder/page.tsx`](../../apps/web/src/app/(builder)/forms/[id]/builder/page.tsx)

Page hiện chỉ là skeleton 3 cột. Cần chuyển thành Client Component và wire vào store + data fetching.

**Cấu trúc 3 cột:**

```
┌─────────────────────────────────────────────────────────┐
│  Header: form title + SaveStatus indicator              │
├──────────────┬────────────────────────┬─────────────────┤
│  StepList    │  FieldCanvas           │  FieldSettings  │
│  (w-64)      │  (flex-1)              │  (w-80)         │
│              │                        │                 │
│  - Step      │  - FieldCard list      │  - Label input  │
│    items     │  - AddField panel      │  - Required     │
│  - Add step  │                        │  - Options      │
│    button    │                        │    (if select)  │
└──────────────┴────────────────────────┴─────────────────┘
```

### 6.2 Danh sách components

Tất cả trong `components/builder/`:

```
components/builder/
├── containers/
│   └── BuilderContainer.tsx        ← fetch form + hydrate store, pass xuống
├── BuilderLayout.tsx               ← 3-cột layout, SaveStatus
├── StepList.tsx                    ← SortableContext cho steps
├── StepItem.tsx                    ← useSortable, inline title edit, delete
├── FieldCanvas.tsx                 ← danh sách fields của step đang chọn
├── FieldCard.tsx                   ← useSortable, hiển thị label + type, delete
├── FieldTypePanel.tsx              ← grid 9 loại field để thêm mới
├── FieldSettings.tsx               ← form chỉnh label, required, options
└── SaveStatus.tsx                  ← "Đang lưu..." / "Đã lưu" / lỗi
```

### 6.3 Mô tả từng component

**`BuilderContainer`**
- Dùng TanStack Query: `useQuery(['form', id], () => fetchFormForEditor(id))`
- Khi data load xong: gọi `setForm(data)` để hydrate store
- Khi `form` trong store thay đổi: trigger `useAutoSave` hook
- Không render bất kỳ JSX builder nào — chỉ truyền `formId` xuống `BuilderLayout`

**`BuilderLayout`**
- Nhận `formId` qua props
- Đọc `useBuilderStore` để lấy `form`, `selectedStepId`, `selectedFieldId`
- Render 3 cột + header

**`StepList`**
- Bọc bằng `SortableContext` (vertical list strategy)
- Render `StepItem` cho mỗi step
- Nút "Thêm bước" ở cuối: gọi `addStep()`

**`StepItem`**
- `useSortable({ id: step.id })` cho drag handle
- Click vào item: `selectStep(step.id)`
- Double-click vào title: vào inline edit mode (`contentEditable` hoặc `<input>` in-place)
- Khi blur inline edit: `updateStep(step.id, { title })`
- Nút xóa (hiện khi hover): disabled + tooltip nếu chỉ còn 1 step

**`FieldCanvas`**
- Hiển thị fields của step đang được `selectedStepId`
- Bọc bằng `SortableContext` (vertical list strategy)
- Render `FieldCard` cho mỗi field
- `FieldTypePanel` nằm ở cuối canvas

**`FieldCard`**
- `useSortable({ id: field.id })`
- Click: `selectField(field.id)` (mở FieldSettings panel)
- Hiển thị: loại field (icon/badge) + label
- Nút xóa: gọi `removeField(stepId, field.id)`

**`FieldTypePanel`**
- Grid 9 ô, mỗi ô là 1 loại field Sprint 1
- Click vào ô: `addField(selectedStepId, type)`
- Disabled nếu không có step nào được chọn

**`FieldSettings`**
- Hiển thị khi `selectedFieldId !== null`
- Đọc field data từ store qua `selectedStepId + selectedFieldId`
- Luôn có: Label input, Required toggle
- Chỉ `select` và `multiselect`: hiển thị Options list (thêm/xóa/sắp xếp option text)
- Chỉ `radio` (Yes/No): KHÔNG hiển thị options editor (fixed `['Có', 'Không']`)
- Dùng `updateField(stepId, fieldId, updates)` khi user thay đổi

**`SaveStatus`**
- 3 trạng thái: `idle` | `saving` | `saved` | `error`
- Idle: không hiển thị gì
- Saving: spinner + "Đang lưu..."
- Saved: checkmark + "Đã lưu" (fade out sau 3s)
- Error: icon cảnh báo + "Lưu thất bại"

---

## 7. Custom Hooks

### `useAutoSave`

```
apps/web/src/components/builder/hooks/useAutoSave.ts
```

Logic:
1. Subscribe vào `form` trong store (dùng `useBuilderStore(s => s.form)`)
2. Mỗi khi `form` thay đổi: debounce 800ms
3. Sau debounce: gọi `PATCH /api/forms/:id` với payload `{ schema: { steps: form.steps }, title: form.title }`
4. Cập nhật `SaveStatus` state (`saving` → `saved` hoặc `error`)

Không dùng `useMutation` của TanStack Query cho auto-save — dùng `useRef` + `setTimeout` để debounce thủ công, tránh race condition.

---

## 8. dnd-kit Setup

### Dependencies

```bash
# apps/web
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### DndContext

Đặt `<DndContext>` bao bọc toàn bộ `BuilderLayout`, dùng `onDragEnd` để dispatch store actions:

```ts
function onDragEnd(event: DragEndEvent) {
  const { active, over } = event
  if (!over || active.id === over.id) return

  const activeData = active.data.current   // { type: 'step' | 'field', stepId? }
  const overData   = over.data.current

  if (activeData.type === 'step') {
    // reorderSteps(fromIndex, toIndex)
  } else if (activeData.type === 'field') {
    // reorderFields(stepId, fromIndex, toIndex)
  }
}
```

### SortableContext

- Steps: `<SortableContext items={stepIds} strategy={verticalListSortingStrategy}>`
- Fields: `<SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>`

Cross-step drag bị disable Sprint 1 — không cần xử lý case `activeData.stepId !== overData.stepId`.

---

## 9. Luồng khởi tạo

```
1. User vào /forms/[id]/builder
2. BuilderContainer: useQuery GET /api/forms/:id/editor
3. Khi data load: setForm(formData) → hydrate store
4. BuilderLayout render với form data từ store
5. User chọn step đầu tiên mặc định (selectedStepId = steps[0].id)
6. Mọi thay đổi → store action → useAutoSave debounce → PATCH API
```

**Xử lý form mới (steps = []):**  
API `createForm` đã tạo sẵn form với 1 step mặc định. Builder không cần xử lý case empty steps khi mở lần đầu.

---

## 10. AC Mapping

| AC | Component / Action |
|---|---|
| AC1: 1 step mặc định khi form mới | API tạo sẵn — `createForm` seed 1 step |
| AC2: Thêm step mới | `StepList` → nút "Thêm bước" → `addStep()` |
| AC3: Đổi tên step inline | `StepItem` → double-click → `updateStep()` |
| AC4: Xóa step (không xóa nếu còn 1) | `StepItem` → delete button → `removeStep()`, disabled khi `steps.length === 1` |
| AC5: Kéo thả sắp xếp steps | `StepItem` + dnd-kit `useSortable` → `reorderSteps()` |
| AC6: Chọn loại field từ danh sách | `FieldTypePanel` → `addField(stepId, type)` |
| AC7: Label + Required cho field | `FieldSettings` → `updateField()` |
| AC8: Options cho Dropdown/Multi-select | `FieldSettings` hiện options editor khi `type === 'select'` hoặc `'multiselect'` |
| AC9: Xóa field | `FieldCard` → delete button → `removeField()` |
| AC10: Kéo thả sắp xếp fields | `FieldCard` + dnd-kit `useSortable` → `reorderFields()` |
| AC11: Auto-save với trạng thái | `useAutoSave` debounce 800ms + `SaveStatus` component |
| AC12: Khôi phục khi quay lại | `BuilderContainer` load từ API, hydrate store |

---

## 11. File mới cần tạo

| File | Loại |
|---|---|
| `apps/web/src/components/builder/containers/BuilderContainer.tsx` | Container |
| `apps/web/src/components/builder/BuilderLayout.tsx` | Presenter |
| `apps/web/src/components/builder/StepList.tsx` | Presenter |
| `apps/web/src/components/builder/StepItem.tsx` | Presenter |
| `apps/web/src/components/builder/FieldCanvas.tsx` | Presenter |
| `apps/web/src/components/builder/FieldCard.tsx` | Presenter |
| `apps/web/src/components/builder/FieldTypePanel.tsx` | Presenter |
| `apps/web/src/components/builder/FieldSettings.tsx` | Presenter |
| `apps/web/src/components/builder/SaveStatus.tsx` | Presenter |
| `apps/web/src/components/builder/hooks/useAutoSave.ts` | Custom hook |
| `apps/web/src/lib/api/forms.ts` | API client (nếu chưa có) |

### File sửa

| File | Thay đổi |
|---|---|
| `apps/web/src/app/(builder)/forms/[id]/builder/page.tsx` | Render `<BuilderContainer formId={id} />` |

---

## 12. Dependency cần cài

```bash
cd apps/web
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Không thêm vào root `package.json`.
