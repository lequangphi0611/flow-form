import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  helpText?: string
  children: React.ReactNode
}

export function FormField({ label, error, required, helpText, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className={cn(required && "after:content-['*'] after:text-red-500 after:ml-0.5")}>
        {label}
      </Label>
      {children}
      {helpText && !error && <p className="text-xs text-gray-500">{helpText}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
