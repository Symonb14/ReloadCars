'use client'

import { EllipsisIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type RowAction = {
  label: string
  icon: ReactNode
  onSelect: () => void
  destructive?: boolean
}

/** "⋯" menu at the end of a table row; destructive actions go last, after a separator. */
export function RowActions({ label, actions }: { label: string; actions: RowAction[] }) {
  const regular = actions.filter((action) => !action.destructive)
  const destructive = actions.filter((action) => action.destructive)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label={`Ações de ${label}`} />}
      >
        <EllipsisIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {regular.map((action) => (
          <DropdownMenuItem key={action.label} onClick={action.onSelect}>
            {action.icon}
            {action.label}
          </DropdownMenuItem>
        ))}
        {destructive.length > 0 && regular.length > 0 ? <DropdownMenuSeparator /> : null}
        {destructive.map((action) => (
          <DropdownMenuItem
            key={action.label}
            variant="destructive"
            onClick={action.onSelect}
          >
            {action.icon}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
