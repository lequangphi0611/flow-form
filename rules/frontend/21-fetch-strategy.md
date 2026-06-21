# 21 — Data Fetching Strategy: quyết định Server / Hybrid / Client (server-first)

> Rule này đứng **trên** rule 04 (client), 10 (server cache), 11 (data layer): nó quyết
> định **chọn cái nào**. Ba rule kia chỉ nói **cách làm** khi đã chọn.

## Nguyên tắc bất biến

1. **Luôn quyết định trước khi code.** Với mỗi data một màn hình cần, BẮT BUỘC chọn một
   trong ba: **Server / Hybrid / Client** — và ghi lý do. Không có default ngầm, không
   "cứ `useQuery` cho nhanh".
2. **Server-first.** Mặc định là **Server Component**. Chỉ rời khỏi Server khi có lý do
   cụ thể (mutation cùng trang, phụ thuộc tương tác, realtime). Nếu phân vân → chọn Server.
3. **Không client-fetch dữ liệu đã có thể lấy ở server lúc render đầu.** Làm vậy tạo
   waterfall + skeleton thừa.

---

## Cây quyết định (đi từ Server xuống)

```
1. Data có cần ngay lúc render lần đầu không?
   ├─ KHÔNG — chỉ xuất hiện sau khi user tương tác
   │         (filter / sort / search / pagination / infinite scroll / mở modal)   → CLIENT
   └─ CÓ → sang bước 2

2. Sau khi đã load, client có cần TỰ cập nhật data không?
   (invalidate sau mutation TRÊN CÙNG TRANG, refetch nền, optimistic update,
    hoặc state editor phức tạp cần Zustand)
   ├─ KHÔNG → SERVER   ← mặc định, ưu tiên
   └─ CÓ → HYBRID
```

> SEO / `generateMetadata` / route public → **luôn Server** (bỏ qua cây trên).

---

## Khi chọn SERVER (mặc định)

- Fetch trong Server Component qua `src/lib/data/*` (rule 11). **Không** `fetch()` thẳng,
  **không** TanStack Query.
- Chọn cache strategy tường minh theo rule 10 (`no-store` / `revalidate` / `tags`).
- 404 → `notFound()`; lỗi khác → `throw` (bắt bởi `error.tsx`) — rule 13.
- Bọc `React.cache()` nếu nhiều nơi trong cùng request cần (page + `generateMetadata`).

## Khi chọn HYBRID

Server fetch lần đầu → đưa data sang client. Hai biến thể:

| Biến thể | Khi nào | Cách |
|---|---|---|
| **Server → `initialData`** | List/detail có mutation cùng trang, cần TanStack Query invalidate | `lib/data` fetch ở server → truyền prop → `useQuery({ initialData })` (rule 04/11) |
| **Server → Zustand** | Editor state phức tạp (builder) | `lib/data` fetch ở server → seed store; client không fetch lại đường đọc |

Quy tắc Hybrid:
- Đường **đọc** đi qua server. Client **không** tự fetch lại cùng data đó → tránh double
  fetch + double source-of-truth.
- **`initialData` PHẢI đi kèm `staleTime` > 0 + `refetchOnMount: false`.** `initialData`
  không ngăn refetch — với `staleTime` mặc định `0`, data bị coi là stale ngay và `useQuery`
  **refetch nền khi mount** → double fetch (server + client). `staleTime` cho initialData
  được coi là fresh; `refetchOnMount: false` chặn hẳn cú fetch lúc mount bất kể stale.
  Mutation vẫn `invalidateQueries` tường minh nên data vẫn cập nhật.
  - **Không** dùng `enabled: false` để chặn (query disabled sẽ **không** refetch sau
    invalidate → mutation không cập nhật được).
  - **Tránh** `staleTime: Infinity`: khi soft-nav rời rồi quay lại trong `gcTime`, cache cũ
    còn nên `initialData` mới bị bỏ qua → hiện data cũ vĩnh viễn (chỉ invalidate mới sửa).
  - Cần "client không bao giờ fetch đường đọc" làm nguyên tắc cứng → dùng
    `HydrationBoundary` + `dehydrate` (server seed lại cache mỗi nav) thay cho `initialData`.
- Auth-protected list thuộc user + có mutation cùng trang → **Hybrid** (không pure-client:
  server đã có cookie, không cần chờ client lấy session rồi mới lấy list).

## Khi chọn CLIENT

- Chỉ khi data **không tồn tại lúc render đầu** (phụ thuộc tương tác) hoặc cực kỳ tương tác.
- `src/lib/api/*` + custom hook bọc `useQuery`/`useMutation` (rule 04).
- Auth form (login/register) cũng là Client — không có server data.

---

## Mapping chuẩn cho FlowForm

| Route | Strategy | Cơ chế |
|---|---|---|
| `(dashboard)/forms` | **Hybrid** (`initialData`) | `getForms` server `no-store` → `initialData` cho `useFormList`; client invalidate sau create/delete |
| `(builder)/forms/[id]/builder` | **Hybrid** (→ Zustand) | `getFormForEditor` (`no-store`, endpoint `/editor`) → seed store; auto-save client |
| `(analytics)/forms/[id]/analytics` | **Hybrid** | summary/funnel server (`revalidate: 300`, `<Suspense>` stream) + bảng responses client (URL state, rule 19) |
| `f/[formId]` (public) | **Server** | `getPublicForm` (`revalidate: 3600` + `tags`), SSR cho SEO; engine là client nhận schema qua props |
| `(auth)/login`, `register` | **Client** | form tương tác, không có server data |

---

## Loading UX cho Server / Hybrid — dùng `<Suspense>` + skeleton

Server fetch sẽ **block** cho tới khi xong. Đừng `await` ngay trong `page.tsx` cho phần
data nặng → block cả trang, mất skeleton (rất tệ khi API cold start). Thay vào đó:

- Giữ `page.tsx` (hoặc shell tĩnh: header, nút) render **ngay**.
- Tách phần fetch vào **async Server Component con**, bọc `<Suspense fallback={<Skeleton/>}>`
  → shell hiện tức thì, data **stream** vào sau, skeleton hiện trong lúc chờ.
- Nhiều khối độc lập → mỗi khối một `<Suspense>` riêng để stream song song (rule 10 §streaming).
- Với Hybrid `initialData`: skeleton "loading" thuộc về **Suspense phía server**, nên client
  container **không** cần nhánh `isLoading` nữa (initialData → không bao giờ loading) — chỉ
  còn `isError` + empty state.

```tsx
// ✅ — page.tsx: shell render ngay, list stream trong Suspense
export default function FormsPage() {
  return (
    <div>
      <Header />                                    {/* tĩnh — hiện ngay */}
      <Suspense fallback={<FormListSkeleton />}>
        <FormListSection />                         {/* async server: fetch + seed client */}
      </Suspense>
    </div>
  )
}
```

```tsx
// ❌ — await thẳng trong page → block cả trang, không có skeleton
export default async function FormsPage() {
  const forms = await getForms()                    // ❌ cả header cũng phải chờ
  return <div><Header /><FormListContainer initialForms={forms} /></div>
}
```

> `loading.tsx` ở segment cũng tạo Suspense tự động nhưng fallback **thay cả trang** (kể cả
> header). Ưu tiên `<Suspense>` quanh đúng phần data để giữ shell tĩnh hiện ngay.

## Anti-patterns

```tsx
// ❌ — Pure client cho list sau auth: waterfall session → list
// useFormList() phụ thuộc useCurrentUser() (fetch session) rồi mới fetch list
// → 2 round-trip tuần tự + skeleton. Phải Hybrid: server đưa userId + initialData.

// ❌ — SSR fetch rồi client lại useQuery cùng data mà KHÔNG truyền initialData
//     → fetch 2 lần, dễ lệch source-of-truth.

// ❌ — useEffect + fetch thủ công (rule 04).

// ❌ — Client-fetch data đã render được ở server chỉ vì "quen tay useQuery".
```

## Checklist

- [ ] Đã quyết định **Server / Hybrid / Client** cho từng data **trước khi** code, có ghi lý do
- [ ] Mặc định **Server**; chỉ rời Server khi có lý do (mutation cùng trang / tương tác / realtime / Zustand editor)
- [ ] Server → `lib/data` (rule 11) + cache strategy tường minh (rule 10)
- [ ] Hybrid → server fetch + `initialData` cho `useQuery` (hoặc seed Zustand); client không fetch lại đường đọc
- [ ] Hybrid `initialData` đi kèm `staleTime` > 0 **và** `refetchOnMount: false` → không fetch lúc mount (tránh double fetch); không dùng `enabled: false` hay `staleTime: Infinity`
- [ ] Client → `lib/api` + custom hook (rule 04); chỉ cho data phụ thuộc tương tác
- [ ] Không client-fetch dữ liệu đã có sẵn lúc render đầu (không tạo waterfall/skeleton thừa)
- [ ] Server/Hybrid: tách async Server Component con + `<Suspense fallback={<Skeleton/>}>`, không `await` block cả trang trong `page.tsx`
- [ ] Hybrid `initialData`: bỏ nhánh `isLoading` ở client (skeleton thuộc Suspense), chỉ giữ `isError` + empty
