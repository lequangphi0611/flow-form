import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'

interface DeleteFormDialogProps {
  formTitle: string
  isOpen: boolean
  isPending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteFormDialog({
  formTitle,
  isOpen,
  isPending = false,
  onConfirm,
  onCancel,
}: DeleteFormDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xóa form này?</DialogTitle>
          <DialogDescription>
            Bạn có chắc muốn xóa form <strong>"{formTitle}"</strong>? Toàn bộ responses liên quan cũng sẽ bị xóa.
            Hành động này không thể hoàn tác.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={onCancel} disabled={isPending}>
              Hủy
            </Button>
          </DialogClose>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending} aria-busy={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? 'Đang xóa...' : 'Xóa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
