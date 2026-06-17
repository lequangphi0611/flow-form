'use client'

import * as React from 'react'
import { Menu } from '@base-ui/react/menu'
import { cn } from '@/lib/utils'

function DropdownMenu(props: Menu.Root.Props) {
  return <Menu.Root {...props} />
}

function DropdownMenuTrigger(props: Menu.Trigger.Props) {
  return <Menu.Trigger data-slot="dropdown-trigger" {...props} />
}

function DropdownMenuPortal(props: Menu.Portal.Props) {
  return <Menu.Portal {...props} />
}

function DropdownMenuContent({
  className,
  align = 'end',
  ...props
}: Menu.Popup.Props & { align?: 'start' | 'end' | 'center' }) {
  return (
    <Menu.Portal>
      <Menu.Positioner align={align} sideOffset={4}>
        <Menu.Popup
          data-slot="dropdown-content"
          className={cn(
            'z-50 min-w-[8rem] overflow-hidden rounded-lg border bg-white p-1 shadow-md',
            'data-[starting-style]:animate-in data-[starting-style]:fade-in-0 data-[starting-style]:zoom-in-95',
            className
          )}
          {...props}
        />
      </Menu.Positioner>
    </Menu.Portal>
  )
}

function DropdownMenuItem({
  className,
  destructive = false,
  ...props
}: Menu.Item.Props & { destructive?: boolean }) {
  return (
    <Menu.Item
      data-slot="dropdown-item"
      className={cn(
        'relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors',
        'data-[highlighted]:bg-gray-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        destructive ? 'text-red-600 data-[highlighted]:bg-red-50' : 'text-gray-700',
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="dropdown-separator" className={cn('-mx-1 my-1 h-px bg-gray-100', className)} {...props} />
}

function DropdownMenuLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dropdown-label"
      className={cn('px-2 py-1.5 text-xs font-semibold text-gray-500', className)}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
}
