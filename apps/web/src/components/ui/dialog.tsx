'use client'

import * as React from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { cn } from '@/lib/utils'

function DialogRoot(props: Dialog.Root.Props) {
  return <Dialog.Root {...props} />
}

function DialogTrigger(props: Dialog.Trigger.Props) {
  return <Dialog.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal(props: Dialog.Portal.Props) {
  return <Dialog.Portal {...props} />
}

function DialogBackdrop({ className, ...props }: Dialog.Backdrop.Props) {
  return (
    <Dialog.Backdrop
      data-slot="dialog-backdrop"
      className={cn(
        'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
        'data-[starting-style]:animate-in data-[starting-style]:fade-in-0',
        'data-[ending-style]:animate-out data-[ending-style]:fade-out-0',
        className
      )}
      {...props}
    />
  )
}

function DialogContent({ className, children, ...props }: Dialog.Popup.Props) {
  return (
    <Dialog.Portal>
      <DialogBackdrop />
      <Dialog.Popup
        data-slot="dialog-content"
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
          'rounded-xl border bg-white p-6 shadow-xl outline-none',
          'data-[starting-style]:animate-in data-[starting-style]:fade-in-0 data-[starting-style]:zoom-in-95',
          'data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[ending-style]:zoom-out-95',
          className
        )}
        {...props}
      >
        {children}
      </Dialog.Popup>
    </Dialog.Portal>
  )
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="dialog-header" className={cn('flex flex-col space-y-1.5 mb-4', className)} {...props} />
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex items-center justify-end gap-2 mt-6', className)}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: Dialog.Title.Props) {
  return (
    <Dialog.Title
      data-slot="dialog-title"
      className={cn('text-lg font-semibold text-gray-900', className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: Dialog.Description.Props) {
  return (
    <Dialog.Description
      data-slot="dialog-description"
      className={cn('text-sm text-gray-500', className)}
      {...props}
    />
  )
}

function DialogClose(props: Dialog.Close.Props) {
  return <Dialog.Close data-slot="dialog-close" {...props} />
}

export {
  DialogRoot as Dialog,
  DialogTrigger,
  DialogPortal,
  DialogBackdrop,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
}
