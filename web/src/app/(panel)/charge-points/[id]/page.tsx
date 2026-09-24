'use client'

import Link from 'next/link'
import { use } from 'react'
import { useAdminGetChargePoint } from '@/api/generated/admin/admin'
import { ChargePointForm } from '@/components/charge-points/charge-point-form'
import { PageHeader } from '@/components/panel/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export default function EditChargePointPage({
  params,
}: PageProps<'/charge-points/[id]'>) {
  const { id } = use(params)
  const chargePoint = useAdminGetChargePoint(id)

  if (chargePoint.isPending) return <Skeleton className="h-96 w-full" />

  if (chargePoint.isError) {
    return (
      <div className="grid gap-4">
        <p className="text-destructive">Ponto de recarga não encontrado.</p>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/charge-points" />}
        >
          Voltar para a lista
        </Button>
      </div>
    )
  }

  if (chargePoint.data.source === 'ocm') {
    return (
      <div className="grid max-w-xl gap-4">
        <h1 className="font-semibold text-2xl">{chargePoint.data.name}</h1>
        <p className="text-muted-foreground">
          Este é um ponto público do Open Charge Map. Ele é atualizado pela importação
          (`npm run import:ocm`) e não pode ser editado pelo painel.
        </p>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/charge-points" />}
        >
          Voltar para a lista
        </Button>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Editar ponto de recarga"
        description={chargePoint.data.partnerName ?? undefined}
      />
      <ChargePointForm chargePoint={chargePoint.data} />
    </>
  )
}
