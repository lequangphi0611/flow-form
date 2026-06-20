---
parent: US-004
layer: web
depends_on: [US-004a]
story_points: 3
---

# US-004c: Field management — FieldCanvas, FieldCard, FieldTypePanel, FieldSettings

## Mô tả

Xây dựng vùng trung tâm (canvas) và panel phải (settings) của Builder: hiển thị danh sách fields của step đang chọn, cho phép thêm field mới từ picker 9 loại, kéo thả sắp xếp, xóa, và chỉnh label + required + options trong panel cài đặt.

## Acceptance Criteria

- [ ] AC6: `FieldTypePanel` hiển thị đúng 9 loại field Sprint 1. Click thêm field gọi `addField(selectedStepId, type)`, field mới xuất hiện trong canvas ngay lập tức
- [ ] AC7: `FieldSettings` hiển thị Label input và Required toggle cho field đang chọn. Mọi thay đổi gọi `updateField()` ngay (không cần nút Save riêng)
- [ ] AC8: Với `select` và `multiselect`: hiển thị options editor (thêm/xóa option text). Với `radio` (Yes/No): không hiển thị options editor (cố định `['Có', 'Không']`)
- [ ] AC9: Nút xóa trên `FieldCard` gọi `removeField(stepId, fieldId)`. Field biến mất khỏi canvas ngay
- [ ] AC10: Kéo thả sắp xếp fields trong cùng step hoạt động, cập nhật store qua `reorderFields(stepId, fromIndex, toIndex)`
- [ ] Click `FieldCard` gọi `selectField(fieldId)`, panel phải hiện `FieldSettings` của field đó
- [ ] `FieldTypePanel` disabled (mờ, không click được) khi `selectedStepId === null`

## Technical Notes

**Files tạo mới:**
- `apps/web/src/components/builder/FieldCanvas.tsx`
- `apps/web/src/components/builder/FieldCard.tsx`
- `apps/web/src/components/builder/FieldTypePanel.tsx`
- `apps/web/src/components/builder/FieldSettings.tsx`

**Wire vào `BuilderLayout`:** thay center-column placeholder bằng `<FieldCanvas />`, thay right-column placeholder bằng `<FieldSettings />`.

**`FieldCanvas`:**
```tsx
<SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
  {fields.map(field => <FieldCard key={field.id} field={field} stepId={stepId} />)}
</SortableContext>
<FieldTypePanel />
```

**`FieldCard`:**
- `useSortable({ id: field.id, data: { type: 'field', stepId } })`
- Hiển thị type badge (icon) + label
- Nút xóa hiện khi hover

**Wire `onDragEnd`** cho field (vào `BuilderLayout`, bên cạnh step logic của US-004b):
```ts
else if (activeData.type === 'field') {
  const stepId    = activeData.stepId
  const fromIndex = fields.findIndex(f => f.id === active.id)
  const toIndex   = fields.findIndex(f => f.id === over.id)
  reorderFields(stepId, fromIndex, toIndex)
}
```

**`FieldTypePanel` — 9 loại hiển thị:**

| Label | `FieldType` | Icon gợi ý |
|---|---|---|
| Text | `text` | `Type` |
| Email | `email` | `Mail` |
| Number | `number` | `Hash` |
| Date | `date` | `Calendar` |
| Textarea | `textarea` | `AlignLeft` |
| Dropdown | `select` | `ChevronDown` |
| Multi-select | `multiselect` | `CheckSquare` |
| Rating | `rating` | `Star` |
| Yes/No | `radio` | `ToggleLeft` |

Icon từ `lucide-react` — đã có trong project.

**`FieldSettings` — options editor:**
- `select` / `multiselect`: render danh sách input text cho từng option, nút thêm option mới (min 1), nút xóa từng option
- `radio`: không render options editor, show note nhỏ "(Cố định: Có / Không)"
- Không cần drag-sort cho options trong Sprint 1

**Options editor lưu vào store:**
```ts
updateField(stepId, fieldId, { options: newOptions })
```

Đọc rules: `rules/frontend/07-builder.md`, `rules/frontend/02-components.md`, `rules/frontend/05-forms.md`
