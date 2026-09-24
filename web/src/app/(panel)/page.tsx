'use client'

import {
  BatteryChargingIcon,
  type LucideIcon,
  PlugZapIcon,
  StoreIcon,
  UsersIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useAdminGetOverview, useAdminListPartners } from '@/api/generated/admin/admin'
import { PageHeader } from '@/components/panel/page-header'
import { StatusBadge } from '@/components/panel/status-badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEnergy, formatMoney, initials } from '@/lib/format'

// Same colors as the app's map pins: partners are the point, public points are context.
const PARTNER_COLOR = '#22c55e'
const PUBLIC_COLOR = '#9ca3af'

export default function OverviewPage() {
  const overview = useAdminGetOverview()
  const partners = useAdminListPartners()

  const recentPartners = [...(partners.data?.partners ?? [])]
    .sort((a, b) => Date.parse(String(b.createdAt)) - Date.parse(String(a.createdAt)))
    .slice(0, 5)

  return (
    <>
      <PageHeader
        title="Visão geral"
        description="Parceiros, pontos de recarga e uso do app."
        actions={
          <>
            <Button
              variant="outline"
              size="lg"
              nativeButton={false}
              render={<Link href="/partners" />}
            >
              Novo parceiro
            </Button>
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/charge-points/new" />}
            >
              Novo ponto
            </Button>
          </>
        }
      />

      {overview.isError ? (
        <p className="text-destructive">Não foi possível carregar os indicadores.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            icon={StoreIcon}
            label="Parceiros ativos"
            value={overview.data?.partners.active}
            detail={
              overview.data ? `de ${overview.data.partners.total} cadastrados` : undefined
            }
          />
          <StatTile
            icon={PlugZapIcon}
            label="Pontos de recarga ativos"
            value={overview.data?.chargePoints.active}
            detail={
              overview.data
                ? `${overview.data.chargePoints.inactive} inativos`
                : undefined
            }
          />
          <StatTile
            icon={UsersIcon}
            label="Motoristas"
            value={overview.data?.drivers}
            detail="contas no app"
          />
          <StatTile
            icon={BatteryChargingIcon}
            label="Recargas no mês"
            value={overview.data?.reloadsThisMonth.count}
            detail={
              overview.data
                ? `${formatEnergy(overview.data.reloadsThisMonth.energyKwh)} · ${formatMoney(overview.data.reloadsThisMonth.totalCents)}`
                : undefined
            }
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Parceiros recentes</CardTitle>
            <CardDescription>Últimos estabelecimentos cadastrados.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-1">
            {partners.isPending ? (
              <Skeleton className="h-40" />
            ) : recentPartners.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum parceiro ainda.</p>
            ) : (
              recentPartners.map((partner) => (
                <Link
                  key={partner.id}
                  href={`/charge-points?partnerId=${partner.id}`}
                  className="-mx-2 flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                >
                  <Avatar className="size-9 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary/15 font-medium text-primary-foreground text-xs">
                      {initials(partner.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-sm">{partner.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {partner.chargePointCount === 1
                        ? '1 ponto de recarga'
                        : `${partner.chargePointCount} pontos de recarga`}
                    </div>
                  </div>
                  <StatusBadge active={partner.active} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pontos por origem</CardTitle>
            <CardDescription>
              Parceiros ReloadCars e pontos públicos do Open Charge Map.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overview.data ? (
              <OriginMeter
                partner={overview.data.chargePoints.partner}
                publicCount={overview.data.chargePoints.public}
              />
            ) : (
              <Skeleton className="h-20" />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon
  label: string
  value: number | undefined
  detail?: string
}) {
  return (
    <Card className="gap-3">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardDescription className="font-medium text-foreground">{label}</CardDescription>
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-green-700">
          <Icon className="size-4" />
        </span>
      </CardHeader>
      <CardContent className="grid gap-1">
        {value === undefined ? (
          <Skeleton className="h-9 w-20" />
        ) : (
          <span className="font-semibold text-3xl tracking-tight">
            {value.toLocaleString('pt-BR')}
          </span>
        )}
        <span className="text-muted-foreground text-sm">{detail ?? ' '}</span>
      </CardContent>
    </Card>
  )
}

/** Part-to-whole bar: two segments with a 2px surface gap, labeled with counts. */
function OriginMeter({ partner, publicCount }: { partner: number; publicCount: number }) {
  const total = partner + publicCount
  if (total === 0) {
    return <p className="text-muted-foreground text-sm">Nenhum ponto cadastrado.</p>
  }

  const segments = [
    { label: 'Parceiros', value: partner, color: PARTNER_COLOR },
    { label: 'Públicos', value: publicCount, color: PUBLIC_COLOR },
  ].filter((segment) => segment.value > 0)

  return (
    <div className="grid gap-4">
      <div
        className="flex h-2.5 gap-0.5 overflow-hidden rounded-full"
        role="img"
        aria-label={`${partner} pontos de parceiros e ${publicCount} públicos`}
      >
        {segments.map((segment) => (
          <div
            key={segment.label}
            title={`${segment.label}: ${segment.value}`}
            className="h-full"
            // Proportional grow keeps the 2px gap exact (percent widths would overflow).
            style={{ flex: `${segment.value} 1 0%`, backgroundColor: segment.color }}
          />
        ))}
      </div>
      <dl className="grid grid-cols-2 gap-4">
        <MeterLegend
          label="Parceiros"
          value={partner}
          total={total}
          color={PARTNER_COLOR}
        />
        <MeterLegend
          label="Públicos"
          value={publicCount}
          total={total}
          color={PUBLIC_COLOR}
        />
      </dl>
    </div>
  )
}

function MeterLegend({
  label,
  value,
  total,
  color,
}: {
  label: string
  value: number
  total: number
  color: string
}) {
  return (
    <div className="grid gap-0.5">
      <dt className="flex items-center gap-2 text-muted-foreground text-sm">
        <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </dt>
      <dd className="font-semibold text-xl">
        {value}{' '}
        <span className="font-normal text-muted-foreground text-sm">
          ({Math.round((value / total) * 100)}%)
        </span>
      </dd>
    </div>
  )
}
