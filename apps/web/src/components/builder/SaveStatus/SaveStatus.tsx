import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

import type { SaveStatusValue } from '../hooks/useAutoSave'

interface SaveStatusProps {
  status: SaveStatusValue
}

export function SaveStatus({ status }: SaveStatusProps) {
  if (status === 'idle') return null

  return (
    <div className="flex items-center gap-1.5 text-sm transition-opacity duration-200">
      {status === 'saving' && (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          <span className="text-gray-500">Đang lưu...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-green-600">Đã lưu</span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span className="text-red-600">Lưu thất bại</span>
        </>
      )}
    </div>
  )
}
