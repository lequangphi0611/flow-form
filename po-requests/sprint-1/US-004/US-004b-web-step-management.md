---
parent: US-004
layer: web
depends_on: [US-004a]
story_points: 2
---

# US-004b: Step management — StepList, StepItem, drag & drop

## Mô tả

Xây dựng panel quản lý steps ở cột trái của Builder: danh sách steps có thể kéo thả, thêm mới, đổi tên inline, và xóa (với guard không cho xóa khi chỉ còn 1 step).

## Acceptance Criteria

- [ ] AC1: Khi mở Builder, danh sách steps hiển thị đúng từ store (tối thiểu 1 step)
- [ ] AC2: Nút "Thêm bước" ở cuối `StepList` gọi `addStep()`, step mới xuất hiện ngay với title "Bước mới"
- [ ] AC3: Double-click vào title step → input inline edit; blur → `updateStep(stepId, { title })`; Enter cũng confirm
- [ ] AC4: Nút xóa step: gọi `removeStep(stepId)`; nếu `steps.length === 1` thì disabled + hiển thị tooltip "Không thể xóa bước duy nhất"
- [ ] AC5: Kéo thả sắp xếp steps hoạt động và cập nhật store qua `reorderSteps(fromIndex, toIndex)`
- [ ] Click vào `StepItem` gọi `selectStep(stepId)` và highlight item đang chọn

## Technical Notes

**Files tạo mới:**
- `apps/web/src/components/builder/StepList.tsx`
- `apps/web/src/components/builder/StepItem.tsx`

**Wire vào `BuilderLayout`:** thay left-column placeholder bằng `<StepList />`.

**`StepList`:**
```tsx
<SortableContext items={stepIds} strategy={verticalListSortingStrategy}>
  {steps.map(step => <StepItem key={step.id} step={step} />)}
</SortableContext>
<Button onClick={addStep}>+ Thêm bước</Button>
```

**`StepItem`:**
- `useSortable({ id: step.id, data: { type: 'step' } })`
- State local `isEditing` (boolean) để toggle inline edit
- Drag handle: icon `GripVertical` từ `lucide-react`
- Tooltip "Không thể xóa bước duy nhất" dùng shadcn `<Tooltip>` (nếu chưa có: `npx shadcn@latest add tooltip`)

**Wire `onDragEnd` trong `BuilderLayout`** (US-004a đã để skeleton):
```ts
if (activeData.type === 'step') {
  const fromIndex = steps.findIndex(s => s.id === active.id)
  const toIndex   = steps.findIndex(s => s.id === over.id)
  reorderSteps(fromIndex, toIndex)
}
```

Đọc rules: `rules/frontend/07-builder.md`, `rules/frontend/02-components.md`, `rules/frontend/06-styling.md`
