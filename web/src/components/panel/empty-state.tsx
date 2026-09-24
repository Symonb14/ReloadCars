import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary/12 text-green-700">
        <Icon className="size-6" />
      </span>
      <div className="grid gap-1">
        <p className="font-medium">{title}</p>
        <p className="max-w-sm text-muted-foreground text-sm">{description}</p>
      </div>
      {action}
    </div>
  )
}
