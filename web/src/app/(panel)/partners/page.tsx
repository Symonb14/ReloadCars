'use client'

import { useQueryClient } from '@tanstack/react-query'
import {
  EyeIcon,
  EyeOffIcon,
  PencilIcon,
  PlugZapIcon,
  PlusIcon,
  StoreIcon,
  Trash2Icon,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  getAdminListChargePointsQueryKey,
  getAdminListPartnersQueryKey,
  useAdminDeletePartner,
  useAdminListPartners,
  useAdminUpdatePartner,
} from '@/api/generated/admin/admin'
import type { AdminListPartners200PartnersItem } from '@/api/generated/models'
import { EmptyState } from '@/components/panel/empty-state'
import { PageHeader } from '@/components/panel/page-header'
import { RowActions } from '@/components/panel/row-actions'
import { StatusBadge } from '@/components/panel/status-badge'
import { PartnerFormDialog } from '@/components/partners/partner-form-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCnpj, formatPhone, initials } from '@/lib/format'

type Partner = AdminListPartners200PartnersItem

export default function PartnersPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const partners = useAdminListPartners()
  const updatePartner = useAdminUpdatePartner()
  const deletePartner = useAdminDeletePartner()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Partner | null>(null)
  const [deleting, setDeleting] = useState<Partner | null>(null)

  function openForm(partner: Partner | null) {
    setEditing(partner)
    setFormOpen(true)
  }

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getAdminListPartnersQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getAdminListChargePointsQueryKey() }),
    ])
  }

  async function toggleActive(partner: Partner, active: boolean) {
    try {
      await updatePartner.mutateAsync({ id: partner.id, data: { active } })
      await refresh()
      toast.success(
        active
          ? `${partner.name} ativado.`
          : `${partner.name} desativado: os pontos dele somem do app.`,
      )
    } catch {
      toast.error('Não foi possível alterar a situação.')
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await deletePartner.mutateAsync({ id: deleting.id })
      await refresh()
      toast.success(`${deleting.name} excluído.`)
    } catch {
      toast.error('Não foi possível excluir o parceiro.')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Parceiros"
        description="Estabelecimentos cujos pontos de recarga aparecem no app."
        actions={
          <Button size="lg" onClick={() => openForm(null)}>
            <PlusIcon />
            Novo parceiro
          </Button>
        }
      />

      <Card className="gap-0 overflow-hidden py-0">
        {partners.isPending ? (
          <div className="grid gap-3 p-6">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : partners.isError ? (
          <p className="p-6 text-destructive">Não foi possível carregar os parceiros.</p>
        ) : partners.data.partners.length === 0 ? (
          <EmptyState
            icon={StoreIcon}
            title="Nenhum parceiro ainda"
            description="Cadastre o primeiro estabelecimento para divulgar os pontos de recarga dele no app."
            action={
              <Button onClick={() => openForm(null)}>
                <PlusIcon />
                Novo parceiro
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-11 pl-6">Parceiro</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead className="text-right">Pontos</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="w-14 pr-6" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.data.partners.map((partner) => (
                <TableRow key={partner.id} className="h-16">
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9 rounded-lg">
                        <AvatarFallback className="rounded-lg bg-primary/15 font-medium text-xs">
                          {initials(partner.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{partner.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground text-xs">
                    {partner.document ? formatCnpj(partner.document) : '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>
                      {partner.email ?? <span className="text-muted-foreground">—</span>}
                    </div>
                    {partner.phone ? (
                      <div className="text-muted-foreground">
                        {formatPhone(partner.phone)}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/charge-points?partnerId=${partner.id}`}
                      className="font-medium tabular-nums underline-offset-4 hover:underline"
                    >
                      {partner.chargePointCount}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge active={partner.active} />
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <RowActions
                      label={partner.name}
                      actions={[
                        {
                          label: 'Editar',
                          icon: <PencilIcon />,
                          onSelect: () => openForm(partner),
                        },
                        {
                          label: 'Ver pontos',
                          icon: <PlugZapIcon />,
                          onSelect: () =>
                            router.push(`/charge-points?partnerId=${partner.id}`),
                        },
                        {
                          label: partner.active ? 'Desativar' : 'Ativar',
                          icon: partner.active ? <EyeOffIcon /> : <EyeIcon />,
                          onSelect: () => toggleActive(partner, !partner.active),
                        },
                        {
                          label: 'Excluir',
                          icon: <Trash2Icon />,
                          destructive: true,
                          onSelect: () => setDeleting(partner),
                        },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <PartnerFormDialog open={formOpen} onOpenChange={setFormOpen} partner={editing} />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.chargePointCount
                ? `Os ${deleting.chargePointCount} pontos de recarga deste parceiro também serão excluídos. `
                : ''}
              O histórico de recargas dos motoristas é mantido. Para só tirar do app,
              desative em vez de excluir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
