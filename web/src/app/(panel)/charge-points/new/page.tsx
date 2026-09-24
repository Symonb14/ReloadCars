'use client'

import { ChargePointForm } from '@/components/charge-points/charge-point-form'
import { PageHeader } from '@/components/panel/page-header'

export default function NewChargePointPage() {
  return (
    <>
      <PageHeader
        title="Novo ponto de recarga"
        description="Pontos de parceiros aparecem em verde no mapa do app."
      />
      <ChargePointForm />
    </>
  )
}
