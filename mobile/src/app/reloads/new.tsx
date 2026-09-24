import Feather from '@expo/vector-icons/Feather'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Pressable, Text, View } from 'react-native'
import { z } from 'zod'
import { ApiError } from '@/api/fetcher'
import { getGetReloadsQueryKey, useCreateReload } from '@/api/generated/reloads/reloads'
import { Button } from '@/components/button'
import { FormError } from '@/components/form-error'
import { Screen } from '@/components/screen'
import { ScreenHeader } from '@/components/screen-header'
import { TextField } from '@/components/text-field'
import {
  formatEnergy,
  formatMoney,
  formatPower,
  formatPricePerKwh,
  parseDecimal,
} from '@/lib/format'
import { previewReload } from '@/lib/reload-preview'
import { type DraftChargePoint, useReloadDraft } from '@/stores/reload-draft'

const wholeNumber = (max: number, message: string) =>
  z
    .string()
    .trim()
    .refine((text) => text === '' || /^\d+$/.test(text), 'Use só números.')
    .refine((text) => text === '' || Number(text) <= max, message)

const optionalDecimal = (max: number, message: string) =>
  z.string().refine((text) => {
    const value = parseDecimal(text)
    return value === undefined || (value > 0 && value <= max)
  }, message)

const reloadFormSchema = z
  .object({
    hours: wholeNumber(24, 'No máximo 24 horas.'),
    minutes: wholeNumber(59, 'Entre 0 e 59.'),
    energy: optionalDecimal(500, 'Informe entre 0,01 e 500 kWh.'),
    price: optionalDecimal(100, 'Informe um preço entre R$ 0,01 e R$ 100,00.'),
  })
  .refine((data) => totalMinutes(data) >= 1 && totalMinutes(data) <= 1440, {
    message: 'Informe um tempo de uso entre 1 minuto e 24 horas.',
    path: ['minutes'],
  })

type ReloadForm = z.infer<typeof reloadFormSchema>

function totalMinutes({ hours, minutes }: { hours: string; minutes: string }) {
  return Number(hours || 0) * 60 + Number(minutes || 0)
}

export default function NewReloadScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const chargePoint = useReloadDraft((state) => state.chargePoint)
  const clearDraft = useReloadDraft((state) => state.clear)
  const [error, setError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    setError: setFieldError,
  } = useForm<ReloadForm>({
    resolver: zodResolver(reloadFormSchema),
    defaultValues: { hours: '', minutes: '', energy: '', price: '' },
  })
  const values = useWatch({ control })

  const createReload = useCreateReload()

  const preview = chargePoint
    ? previewReload({
        durationMinutes: totalMinutes({
          hours: values.hours ?? '',
          minutes: values.minutes ?? '',
        }),
        energyKwh: validOrUndefined(parseDecimal(values.energy ?? '')),
        pricePerKwhCents: toCents(validOrUndefined(parseDecimal(values.price ?? ''))),
        point: chargePoint,
      })
    : null

  async function onSubmit(form: ReloadForm) {
    if (!chargePoint) return setError('Selecione o local da recarga.')
    setError(null)

    const energyKwh = parseDecimal(form.energy)
    if (energyKwh === undefined && !chargePoint.powerKw) {
      return setFieldError('energy', {
        message: 'Este ponto não tem potência cadastrada: informe a energia.',
      })
    }

    try {
      const reload = await createReload.mutateAsync({
        data: {
          chargePointId: chargePoint.id,
          durationMinutes: totalMinutes(form),
          ...(energyKwh !== undefined ? { energyKwh } : {}),
          ...(chargePoint.pricePerKwhCents == null &&
          parseDecimal(form.price) !== undefined
            ? { pricePerKwhCents: toCents(parseDecimal(form.price)) }
            : {}),
        },
      })

      await queryClient.invalidateQueries({ queryKey: getGetReloadsQueryKey() })
      clearDraft()
      router.replace({
        pathname: '/reloads/summary',
        params: {
          name: reload.chargePointName,
          durationMinutes: String(reload.durationMinutes),
          energyKwh: String(reload.energyKwh),
          energyEstimated: String(reload.energyEstimated),
          ...(reload.totalCents != null ? { totalCents: String(reload.totalCents) } : {}),
        },
      })
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 400
          ? caught.message
          : 'Não foi possível salvar a recarga. Tente novamente.',
      )
    }
  }

  return (
    <Screen>
      <ScreenHeader title="Nova recarga" />

      <View className="gap-6">
        <ChargePointField
          chargePoint={chargePoint}
          onSelect={() => router.push('/reloads/select-point')}
        />

        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase text-ink">Tempo de uso</Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <TextField
                control={control}
                name="hours"
                label="Horas"
                placeholder="0"
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <View className="flex-1">
              <TextField
                control={control}
                name="minutes"
                label="Minutos"
                placeholder="0"
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
          </View>
        </View>

        <View className="gap-1.5">
          <TextField
            control={control}
            name="energy"
            label="Energia (kWh)"
            placeholder={
              preview?.estimatedEnergyKwh !== undefined
                ? `Estimativa: ${formatEnergy(preview.estimatedEnergyKwh)}`
                : 'Ex.: 30,5'
            }
            keyboardType="decimal-pad"
          />
          <Text className="text-xs text-muted">
            {chargePoint?.powerKw
              ? `Confira no carregador. Em branco, estimamos pela potência do ponto (${formatPower(chargePoint.powerKw)}) × tempo.`
              : 'Confira no visor do carregador quantos kWh foram entregues.'}
          </Text>
        </View>

        {chargePoint?.pricePerKwhCents != null ? (
          <View className="gap-1.5">
            <Text className="text-xs font-semibold uppercase text-ink">Preço</Text>
            <Text className="text-base text-ink">
              {formatPricePerKwh(chargePoint.pricePerKwhCents)} (preço do parceiro)
            </Text>
          </View>
        ) : (
          <TextField
            control={control}
            name="price"
            label="Preço por kWh (opcional)"
            placeholder="Ex.: 2,00"
            keyboardType="decimal-pad"
          />
        )}

        {preview ? <PreviewCard preview={preview} /> : null}

        <FormError message={error} />

        <Button
          title="Salvar recarga"
          loading={createReload.isPending}
          onPress={handleSubmit(onSubmit)}
        />
      </View>
    </Screen>
  )
}

function ChargePointField({
  chargePoint,
  onSelect,
}: {
  chargePoint: DraftChargePoint | null
  onSelect: () => void
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-semibold uppercase text-ink">Local</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onSelect}
        className="flex-row items-center gap-3 rounded-lg bg-field p-4 active:opacity-80"
      >
        <Feather name="map-pin" size={18} color="#16a34a" />
        <View className="flex-1">
          {chargePoint ? (
            <>
              <Text className="text-base font-semibold text-ink" numberOfLines={1}>
                {chargePoint.name}
              </Text>
              {chargePoint.address ? (
                <Text className="text-sm text-muted" numberOfLines={1}>
                  {chargePoint.address}
                </Text>
              ) : null}
            </>
          ) : (
            <Text className="text-base text-muted">Selecionar local</Text>
          )}
        </View>
        <Feather name="chevron-right" size={18} color="#6b7280" />
      </Pressable>
    </View>
  )
}

function PreviewCard({ preview }: { preview: ReturnType<typeof previewReload> }) {
  return (
    <View className="gap-1 rounded-2xl bg-brand/10 p-4">
      <Text className="text-xs font-semibold uppercase text-brand-pressed">Prévia</Text>
      <Text className="text-base text-ink">
        Energia:{' '}
        {preview.energyKwh !== undefined
          ? `${formatEnergy(preview.energyKwh)}${preview.energyEstimated ? ' (estimada)' : ''}`
          : '—'}
      </Text>
      <Text className="text-lg font-bold text-ink">
        {preview.totalCents !== undefined
          ? `Total: ${formatMoney(preview.totalCents)}`
          : 'Informe o preço por kWh para calcular o valor.'}
      </Text>
    </View>
  )
}

function validOrUndefined(value: number | undefined) {
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : undefined
}

function toCents(reais: number | undefined) {
  return reais === undefined ? undefined : Math.round(reais * 100)
}
