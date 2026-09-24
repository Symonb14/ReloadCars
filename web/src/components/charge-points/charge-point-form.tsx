'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { ApiError } from '@/api/fetcher'
import {
  getAdminGetChargePointQueryKey,
  getAdminListChargePointsQueryKey,
  getAdminListPartnersQueryKey,
  useAdminCreateChargePoint,
  useAdminListPartners,
  useAdminUpdateChargePoint,
} from '@/api/generated/admin/admin'
import {
  AdminCreateChargePointBodyConnectorsItem,
  type AdminGetChargePoint200,
} from '@/api/generated/models'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { parseDecimal, toDecimalInput } from '@/lib/format'
import { AddressSearch } from './address-search'
import type { Coordinates } from './location-picker'

// MapLibre needs the browser (window/WebGL): load the map only on the client.
const LocationPicker = dynamic(() => import('./location-picker'), {
  ssr: false,
  loading: () => <Skeleton className="h-80 w-full" />,
})

const BETIM: Coordinates = { latitude: -19.9678, longitude: -44.1983 }
const CONNECTORS = Object.values(AdminCreateChargePointBodyConnectorsItem)
type Connector = (typeof CONNECTORS)[number]

const optionalDecimal = (max: number, message: string) =>
  z.string().refine((text) => {
    const value = parseDecimal(text)
    return value === undefined || (value >= 0 && value <= max)
  }, message)

const chargePointFormSchema = z.object({
  partnerId: z.string().min(1, 'Selecione o parceiro.'),
  name: z.string().trim().min(2, 'Informe o nome do ponto.'),
  address: z.string().trim().max(500),
  location: z
    .object({ latitude: z.number(), longitude: z.number() })
    .nullable()
    .refine((value) => value !== null, 'Posicione o ponto no mapa.'),
  power: optionalDecimal(1000, 'Potência entre 0 e 1000 kW.'),
  price: optionalDecimal(100, 'Preço entre R$ 0,00 e R$ 100,00.'),
  connectors: z.array(z.enum(CONNECTORS)),
  openingHours: z.string().trim().max(200),
  description: z.string().trim().max(500),
  active: z.boolean(),
})

// Before validation the location may be empty; after it, it is guaranteed.
type ChargePointFormInput = z.input<typeof chargePointFormSchema>
type ChargePointForm = z.output<typeof chargePointFormSchema>

export function ChargePointForm({
  chargePoint,
}: {
  chargePoint?: AdminGetChargePoint200
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const partners = useAdminListPartners()
  const createChargePoint = useAdminCreateChargePoint()
  const updateChargePoint = useAdminUpdateChargePoint()
  const [focusOn, setFocusOn] = useState<Coordinates | null>(null)

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ChargePointFormInput, unknown, ChargePointForm>({
    resolver: zodResolver(chargePointFormSchema),
    defaultValues: {
      partnerId: chargePoint?.partnerId ?? '',
      name: chargePoint?.name ?? '',
      address: chargePoint?.address ?? '',
      location: chargePoint
        ? { latitude: chargePoint.latitude, longitude: chargePoint.longitude }
        : null,
      power: toDecimalInput(chargePoint?.powerKw, 1),
      price: toDecimalInput(
        chargePoint?.pricePerKwhCents != null ? chargePoint.pricePerKwhCents / 100 : null,
      ),
      connectors: (chargePoint?.connectors ?? []).filter((c): c is Connector =>
        CONNECTORS.includes(c as Connector),
      ),
      openingHours: chargePoint?.openingHours ?? '',
      description: chargePoint?.description ?? '',
      active: chargePoint?.active ?? true,
    },
  })

  const location = watch('location')

  async function onSubmit(form: ChargePointForm) {
    if (!form.location) return
    const power = parseDecimal(form.power)
    const price = parseDecimal(form.price)

    const data = {
      partnerId: form.partnerId,
      name: form.name,
      address: form.address || null,
      latitude: form.location.latitude,
      longitude: form.location.longitude,
      powerKw: power ?? null,
      pricePerKwhCents: price === undefined ? null : Math.round(price * 100),
      connectors: form.connectors,
      openingHours: form.openingHours || null,
      description: form.description || null,
      active: form.active,
    }

    try {
      if (chargePoint) {
        await updateChargePoint.mutateAsync({ id: chargePoint.id, data })
      } else {
        await createChargePoint.mutateAsync({ data })
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getAdminListChargePointsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getAdminListPartnersQueryKey() }),
        chargePoint
          ? queryClient.invalidateQueries({
              queryKey: getAdminGetChargePointQueryKey(chargePoint.id),
            })
          : null,
      ])
      toast.success(
        chargePoint ? 'Ponto atualizado.' : 'Ponto criado. Já aparece no app.',
      )
      router.push('/charge-points')
    } catch (error) {
      toast.error(
        error instanceof ApiError && error.status === 400
          ? error.message
          : 'Não foi possível salvar o ponto.',
      )
    }
  }

  const partnerItems = (partners.data?.partners ?? []).map((partner) => ({
    value: partner.id,
    label: partner.active ? partner.name : `${partner.name} (inativo)`,
  }))

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-6 lg:grid-cols-[1fr_1.2fr]"
    >
      <Card>
        <CardHeader>
          <CardTitle>Dados do ponto</CardTitle>
          <CardDescription>
            O que o motorista vê no painel do ponto no app.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Parceiro" error={errors.partnerId?.message}>
            <Controller
              control={control}
              name="partnerId"
              render={({ field }) => (
                <Select
                  items={partnerItems}
                  value={field.value || null}
                  onValueChange={(value) => field.onChange(value ?? '')}
                >
                  <SelectTrigger className="w-full" aria-label="Parceiro">
                    <SelectValue placeholder="Selecione o parceiro" />
                  </SelectTrigger>
                  <SelectContent>
                    {partnerItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field label="Nome" htmlFor="name" error={errors.name?.message}>
            <Input
              id="name"
              placeholder="Ex.: Posto ABC – Centro"
              {...register('name')}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Potência (kW)" htmlFor="power" error={errors.power?.message}>
              <Input
                id="power"
                inputMode="decimal"
                placeholder="22"
                {...register('power')}
              />
            </Field>
            <Field
              label="Preço por kWh (R$)"
              htmlFor="price"
              error={errors.price?.message}
              hint="Em branco: “Consulte no local”."
            >
              <Input
                id="price"
                inputMode="decimal"
                placeholder="1,80"
                {...register('price')}
              />
            </Field>
          </div>

          <Field label="Conectores">
            <Controller
              control={control}
              name="connectors"
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CONNECTORS.map((connector) => (
                    <Label
                      key={connector}
                      className="flex items-center gap-2 font-normal"
                    >
                      <Checkbox
                        checked={field.value.includes(connector)}
                        onCheckedChange={(checked) =>
                          field.onChange(
                            checked
                              ? [...field.value, connector]
                              : field.value.filter((item) => item !== connector),
                          )
                        }
                      />
                      {connector}
                    </Label>
                  ))}
                </div>
              )}
            />
          </Field>

          <Field label="Funcionamento" htmlFor="openingHours">
            <Input
              id="openingHours"
              placeholder="Ex.: 24 horas ou Seg. a sáb., 7h às 22h"
              {...register('openingHours')}
            />
          </Field>

          <Field label="Descrição" htmlFor="description">
            <Textarea id="description" rows={3} {...register('description')} />
          </Field>

          <Controller
            control={control}
            name="active"
            render={({ field }) => (
              <Label className="flex items-center gap-3 font-normal">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
                Ativo (aparece no app)
              </Label>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Localização</CardTitle>
          <CardDescription>
            Busque o endereço e ajuste o pino no mapa: clique ou arraste até a posição
            exata do carregador.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <AddressSearch
            near={location ?? BETIM}
            onSelect={(place) => {
              const coordinates = { latitude: place.latitude, longitude: place.longitude }
              setValue('address', place.address, { shouldDirty: true })
              setValue('location', coordinates, {
                shouldDirty: true,
                shouldValidate: true,
              })
              setFocusOn(coordinates)
            }}
          />
          <Controller
            control={control}
            name="location"
            render={({ field }) => (
              <LocationPicker
                value={field.value}
                onChange={field.onChange}
                fallbackCenter={BETIM}
                focusOn={focusOn}
              />
            )}
          />
          {errors.location ? (
            <p className="text-destructive text-sm">{errors.location.message}</p>
          ) : location ? (
            <p className="font-mono text-muted-foreground text-xs">
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </p>
          ) : null}

          <Field label="Endereço exibido no app" htmlFor="address">
            <Input id="address" {...register('address')} />
          </Field>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/charge-points')}
            >
              Cancelar
            </Button>
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting
                ? 'Salvando…'
                : chargePoint
                  ? 'Salvar alterações'
                  : 'Criar ponto'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : hint ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </div>
  )
}
