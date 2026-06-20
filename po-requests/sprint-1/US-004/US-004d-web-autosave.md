---
parent: US-004
layer: web
depends_on: [US-004a]
story_points: 1
---

# US-004d: Auto-save — useAutoSave hook + SaveStatus indicator

## Mô tả

Mọi thay đổi trong Builder được tự động gửi về server sau 800ms debounce. Header Builder hiển thị trạng thái lưu để người dùng yên tâm.

## Acceptance Criteria

- [ ] AC11: Sau bất kỳ thay đổi nào trong store (steps, fields), Builder tự động gọi `PATCH /api/forms/:id` sau 800ms ngừng thao tác. Trong lúc đang gửi hiển thị "Đang lưu...", sau khi thành công hiển thị "Đã lưu" (fade out sau 3 giây)
- [ ] AC12: Khi owner thoát Builder rồi quay lại, `BuilderContainer` load lại từ API và khôi phục đúng trạng thái (đã đảm bảo bởi US-004a — AC này verify end-to-end)

## Technical Notes

**Files tạo mới:**
- `apps/web/src/components/builder/hooks/useAutoSave.ts`
- `apps/web/src/components/builder/SaveStatus.tsx`

**Wire vào `BuilderContainer`:** gọi `useAutoSave(formId)` trong container.  
**Wire `SaveStatus` vào `BuilderLayout`:** đặt ở header, bên cạnh form title.

**`useAutoSave` — không dùng TanStack Query mutation:**
```ts
export function useAutoSave(formId: string) {
  const form        = useBuilderStore(s => s.form)
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [status, setStatus] = useState<SaveStatusValue>('idle')

  useEffect(() => {
    if (!form) return
    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      setStatus('saving')
      try {
        await updateFormSchema(formId, { schema: { steps: form.steps }, title: form.title })
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 3000)
      } catch {
        setStatus('error')
      }
    }, 800)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [form, formId])

  return status
}
```

`SaveStatusValue` type: `'idle' | 'saving' | 'saved' | 'error'`

**`SaveStatus` component** nhận `status: SaveStatusValue` qua props:
- `idle`: render `null`
- `saving`: spinner (Loader2 icon animate-spin) + "Đang lưu..."
- `saved`: CheckCircle2 icon + "Đã lưu" (text-green-600)
- `error`: AlertCircle icon + "Lưu thất bại" (text-red-600)

**`updateFormSchema`** đã được tạo trong US-004a (`lib/api/forms.ts`). Sub-story này chỉ consume, không tạo lại.

**Lý do không dùng useMutation:** auto-save fire nhiều lần nhanh, TanStack Query mutation không cancel request cũ tự động → có thể ghi đè state cũ lên mới. `useRef` + `clearTimeout` đảm bảo chỉ request cuối cùng được gửi.

Đọc rules: `rules/frontend/04-data-fetching.md`, `rules/frontend/03-state.md`
