'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X } from 'lucide-react'

import type { FieldSchema } from '@flowform/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface FieldSettingsProps {
  field: FieldSchema | null
  onUpdateField: (updates: Partial<FieldSchema>) => void
}

export function FieldSettings({ field, onUpdateField }: FieldSettingsProps) {
  const [labelValue, setLabelValue] = useState('')
  const [localOptions, setLocalOptions] = useState<string[]>([])

  useEffect(() => {
    if (field) {
      setLabelValue(field.label)
      setLocalOptions(field.options ?? [])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field?.id])

  const handleLabelBlur = useCallback(() => {
    if (!field) return
    const trimmed = labelValue.trim()
    if (!trimmed) {
      setLabelValue(field.label)
      return
    }
    if (trimmed !== field.label) {
      onUpdateField({ label: trimmed })
    }
  }, [field, labelValue, onUpdateField])

  const handleRequiredChange = useCallback(
    (checked: boolean) => {
      onUpdateField({ required: checked })
    },
    [onUpdateField],
  )

  function commitOptions(options: string[]) {
    onUpdateField({ options })
  }

  function updateOption(index: number, value: string) {
    setLocalOptions((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  function addOption() {
    const next = [...localOptions, '']
    setLocalOptions(next)
    commitOptions(next)
  }

  function removeOption(index: number) {
    const next = localOptions.filter((_, i) => i !== index)
    setLocalOptions(next)
    commitOptions(next)
  }

  if (!field) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-sm text-gray-400 text-center px-4">Chọn field để chỉnh sửa</p>
      </div>
    )
  }

  const hasOptions = field.type === 'select' || field.type === 'multiselect'
  const isYesNo = field.type === 'radio'

  return (
    <div className="p-4 space-y-5">
      <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">Cài đặt field</p>

      <div className="space-y-2">
        <Label htmlFor="field-label" className="text-sm font-medium text-gray-700">
          Nhãn
        </Label>
        <Input
          id="field-label"
          value={labelValue}
          onChange={(e) => setLabelValue(e.target.value)}
          onBlur={handleLabelBlur}
          className="h-9 text-sm"
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="field-required" className="text-sm font-medium text-gray-700">
          Bắt buộc
        </Label>
        <Switch
          id="field-required"
          checked={field.required}
          onCheckedChange={handleRequiredChange}
        />
      </div>

      {hasOptions && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Lựa chọn</Label>
          <div className="space-y-2">
            {localOptions.map((option, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={option}
                  onChange={(e) => updateOption(i, e.target.value)}
                  onBlur={() => commitOptions(localOptions)}
                  placeholder={`Lựa chọn ${i + 1}`}
                  className="h-9 text-sm"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Xóa lựa chọn"
                  onClick={() => removeOption(i)}
                  className="h-8 w-8 shrink-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={addOption}
            className="w-full justify-start gap-2 text-gray-600"
          >
            <Plus className="h-4 w-4" />
            Thêm lựa chọn
          </Button>
        </div>
      )}

      {isYesNo && (
        <p className="text-xs text-gray-400">Cố định: Có / Không</p>
      )}
    </div>
  )
}
