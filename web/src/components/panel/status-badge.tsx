import { Badge } from '@/components/ui/badge'

export function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge className="border-transparent bg-green-100 text-green-800">
      <span className="size-1.5 rounded-full bg-green-600" /> Ativo
    </Badge>
  ) : (
    <Badge variant="secondary" className="text-muted-foreground">
      <span className="size-1.5 rounded-full bg-muted-foreground" /> Inativo
    </Badge>
  )
}
