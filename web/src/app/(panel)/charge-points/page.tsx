'use client'

import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  PencilIcon,
  PlugZapIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  getAdminListChargePointsQueryKey,
  getAdminListPartnersQueryKey,
  useAdminDeleteChargePoint,
  useAdminListChargePoints,
  useAdminListPartners,
  useAdminUpdateChargePoint,
} from '@/api/generated/admin/admin'
import type {
  AdminListChargePoints200ChargePointsItem,
  AdminListChargePointsSource,
} from '@/api/generated/models'
import { EmptyState } from '@/components/panel/empty-state'
import { PageHeader } from '@/components/panel/page-header'
import { RowActions } from '@/components/panel/row-actions'
import { StatusBadge } from '@/components/panel/status-badge'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatPower, formatPricePerKwh } from '@/lib/format'

type ChargePoint = AdminListChargePoints200ChargePointsItem
type SourceFilter = 'all' | AdminListChargePointsSource

const ALL_PARTNERS = 'all'
const PAGE_SIZE = 50

export default function ChargePointsPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ChargePointsList />
    </Suspense>
  )
}

function ChargePointsList() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const [source, setSource] = useState<SourceFilter>('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [deleting, setDeleting] = useState<ChargePoint | null>(null)
  const partnerId = searchParams.get('partnerId') ?? ALL_PARTNERS

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timeout)
  }, [search])

  // The page belongs to one set of filters: changing a filter goes back to page 1.
  const filtersKey = [source, partnerId, debouncedSearch].join('|')
  const [pagination, setPagination] = useState({ filtersKey, page: 1 })
  const page = pagination.filtersKey === filtersKey ? pagination.page : 1
  const goToPage = (next: number) => setPagination({ filtersKey, page: next })

  const partners = useAdminListPartners()
  const chargePoints = useAdminListChargePoints(
    {
      ...(source !== 'all' ? { source } : {}),
      ...(partnerId !== ALL_PARTNERS ? { partnerId } : {}),
      ...(debouncedSearch ? { q: debouncedSearch } : {}),
      page,
      pageSize: PAGE_SIZE,
    },
    // Keep the current page on screen while the next one loads.
    { query: { placeholderData: keepPreviousData } },
  )
  const updateChargePoint = useAdminUpdateChargePoint()
  const deleteChargePoint = useAdminDeleteChargePoint()

  const partnerItems = [
    { value: ALL_PARTNERS, label: 'Todos os parceiros' },
    ...(partners.data?.partners ?? []).map((p) => ({ value: p.id, label: p.name })),
  ]

  function selectPartner(value: string | null) {
    const params = new URLSearchParams(searchParams)
    if (!value || value === ALL_PARTNERS) params.delete('partnerId')
    else params.set('partnerId', value)
    router.replace(`/charge-points${params.size ? `?${params}` : ''}`)
  }

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getAdminListChargePointsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getAdminListPartnersQueryKey() }),
    ])
  }

  async function toggleActive(point: ChargePoint, active: boolean) {
    try {
      await updateChargePoint.mutateAsync({ id: point.id, data: { active } })
      await refresh()
      toast.success(active ? `${point.name} ativado.` : `${point.name} desativado.`)
    } catch {
      toast.error('Não foi possível alterar a situação.')
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await deleteChargePoint.mutateAsync({ id: deleting.id })
      await refresh()
      toast.success(`${deleting.name} excluído.`)
    } catch {
      toast.error('Não foi possível excluir o ponto.')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Pontos de recarga"
        description="Pontos de parceiros (editáveis) e públicos do Open Charge Map (somente leitura)."
        actions={
          <Button
            size="lg"
            nativeButton={false}
            render={<Link href="/charge-points/new" />}
          >
            <PlusIcon />
            Novo ponto
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={source} onValueChange={(value) => setSource(value as SourceFilter)}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="partner">Parceiros</TabsTrigger>
            <TabsTrigger value="ocm">Públicos</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select items={partnerItems} value={partnerId} onValueChange={selectPartner}>
          <SelectTrigger className="w-56 bg-card" aria-label="Filtrar por parceiro">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {partnerItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative ml-auto w-full sm:w-72">
          <SearchIcon className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar pelo nome…"
            className="bg-card pl-9"
            aria-label="Buscar pelo nome"
          />
        </div>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        {chargePoints.isPending ? (
          <div className="grid gap-3 p-6">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : chargePoints.isError ? (
          <p className="p-6 text-destructive">Não foi possível carregar os pontos.</p>
        ) : chargePoints.data.chargePoints.length === 0 ? (
          <EmptyState
            icon={PlugZapIcon}
            title="Nenhum ponto encontrado"
            description="Ajuste os filtros ou cadastre um novo ponto de recarga de um parceiro."
          />
        ) : (
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-11 pl-6">Ponto</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">Potência</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead>Conectores</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="w-14 pr-6" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {chargePoints.data.chargePoints.map((point) => {
                const isPartner = point.source === 'partner'
                return (
                  <TableRow key={point.id} className="h-16">
                    <TableCell className="max-w-72 pl-6">
                      <div className="truncate font-medium">{point.name}</div>
                      <div className="truncate text-muted-foreground text-xs">
                        {point.address ?? '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isPartner ? (
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <span className="size-2 rounded-full bg-primary" />
                          {point.partnerName}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground text-sm">
                          <span className="size-2 rounded-full bg-gray-400" />
                          Público
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {point.powerKw != null ? formatPower(point.powerKw) : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {point.pricePerKwhCents != null
                        ? formatPricePerKwh(point.pricePerKwhCents)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <ConnectorBadges connectors={point.connectors} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge active={point.active} />
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      {isPartner ? (
                        <RowActions
                          label={point.name}
                          actions={[
                            {
                              label: 'Editar',
                              icon: <PencilIcon />,
                              onSelect: () => router.push(`/charge-points/${point.id}`),
                            },
                            {
                              label: point.active ? 'Desativar' : 'Ativar',
                              icon: point.active ? <EyeOffIcon /> : <EyeIcon />,
                              onSelect: () => toggleActive(point, !point.active),
                            },
                            {
                              label: 'Excluir',
                              icon: <Trash2Icon />,
                              destructive: true,
                              onSelect: () => setDeleting(point),
                            },
                          ]}
                        />
                      ) : (
                        <span
                          className="inline-flex size-8 items-center justify-center text-muted-foreground"
                          title="Ponto público: atualizado pela importação do Open Charge Map"
                        >
                          <LockIcon className="size-4" />
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        {chargePoints.data && chargePoints.data.total > 0 ? (
          <PaginationFooter
            page={page}
            pageSize={PAGE_SIZE}
            total={chargePoints.data.total}
            loading={chargePoints.isPlaceholderData}
            onPageChange={goToPage}
          />
        ) : null}
      </Card>

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
              O ponto some do app. O histórico de recargas dos motoristas é mantido. Para
              só esconder temporariamente, desative em vez de excluir.
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

/** Up to two connector chips, then "+N". */
function ConnectorBadges({ connectors }: { connectors: string[] }) {
  if (connectors.length === 0) return <span className="text-muted-foreground">—</span>
  const visible = connectors.slice(0, 2)
  const hidden = connectors.length - visible.length
  return (
    <div className="flex flex-wrap gap-1" title={connectors.join(', ')}>
      {visible.map((connector) => (
        <Badge key={connector} variant="outline" className="font-normal">
          {connector}
        </Badge>
      ))}
      {hidden > 0 ? (
        <Badge variant="secondary" className="font-normal">
          +{hidden}
        </Badge>
      ) : null}
    </div>
  )
}

function PaginationFooter({
  page,
  pageSize,
  total,
  loading,
  onPageChange,
}: {
  page: number
  pageSize: number
  total: number
  loading: boolean
  onPageChange: (page: number) => void
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize))
  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between gap-4 border-t px-6 py-3">
      <p className="text-muted-foreground text-sm">
        {first.toLocaleString('pt-BR')}–{last.toLocaleString('pt-BR')} de{' '}
        {total.toLocaleString('pt-BR')} pontos
      </p>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">
          Página {page} de {lastPage}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeftIcon />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= lastPage || loading}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  )
}
