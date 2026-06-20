---
parent: US-004
layer: web
depends_on: []
story_points: 2
---

# US-004a: Builder foundation — container, layout, DndContext, API client

## Mô tả

Dựng khung hạ tầng cho toàn bộ Builder: wire `page.tsx` vào container, tạo `BuilderContainer` fetch + hydrate store, tạo `BuilderLayout` 3 cột, thiết lập `DndContext`, và tạo `lib/api/forms.ts`. Sub-story này không render tính năng steps hay fields — chỉ cần builder page load được form và hiển thị layout trống là đủ.

## Acceptance Criteria

- [ ] `page.tsx` render `<BuilderContainer formId={id} />` (không còn là skeleton hardcode)
- [ ] `BuilderContainer` gọi `GET /api/forms/:id/editor` và gọi `setForm()` khi data về
- [ ] `BuilderLayout` render 3 cột (left 256px / center flex-1 / right 320px) + header với form title
- [ ] `DndContext` bọc toàn bộ layout, `onDragEnd` skeleton sẵn sàng để US-004b và US-004c wire vào
- [ ] `lib/api/forms.ts` export `fetchFormForEditor(id)` và `updateFormSchema(id, dto)` (sẽ dùng trong US-004d)
- [ ] Builder page load không bị lỗi khi mở `/forms/[id]/builder`

## Technical Notes

**Cài dependency trước:**
```bash
cd apps/web
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Files tạo mới:**
- `apps/web/src/components/builder/containers/BuilderContainer.tsx`
- `apps/web/src/components/builder/BuilderLayout.tsx`
- `apps/web/src/lib/api/forms.ts`

**File sửa:**
- `apps/web/src/app/(builder)/forms/[id]/builder/page.tsx` — render `<BuilderContainer formId={id} />`

**`BuilderContainer`** là Client Component:
```
useQuery(['form-editor', id], () => fetchFormForEditor(id))
useEffect(() => { if (data) setForm(data) }, [data])
```

**`BuilderLayout`** đọc `useBuilderStore(s => s.form)` để lấy title hiển thị trong header. Ba slot: left (StepList placeholder), center (FieldCanvas placeholder), right (FieldSettings placeholder) — sẽ được điền ở US-004b và US-004c.

**`onDragEnd` trong DndContext:**
```ts
function onDragEnd(event: DragEndEvent) {
  const { active, over } = event
  if (!over || active.id === over.id) return
  // US-004b wire reorderSteps() ở đây
  // US-004c wire reorderFields() ở đây
}
```

Đọc rules: `rules/frontend/04-data-fetching.md`, `rules/frontend/08-presenter-container.md`, `rules/frontend/11-data-layer.md`
