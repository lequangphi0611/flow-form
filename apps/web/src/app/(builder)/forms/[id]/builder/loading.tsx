// Hiện ngay khi điều hướng vào builder (cũng là boundary cho route prefetch),
// trong lúc Server Component fetch form. Khớp layout 3-panel của BuilderLayout.
export default function BuilderLoading() {
  return (
    <div className="flex flex-col w-full h-full">
      <div className="h-14 border-b bg-white shrink-0" />
      <div className="flex flex-1 min-h-0">
        <div className="w-64 border-r bg-white" />
        <div className="flex-1 bg-gray-100" />
        <div className="w-72 border-l bg-white" />
      </div>
    </div>
  )
}
