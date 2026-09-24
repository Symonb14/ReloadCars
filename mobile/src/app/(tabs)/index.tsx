import Feather from '@expo/vector-icons/Feather'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native'
import { SafeAreaView as TabsSafeAreaView } from 'react-native-screens/experimental'
import type { GetReloads200ReloadsItem } from '@/api/generated/models'
import {
  getGetReloadsQueryKey,
  useDeleteReload,
  useGetReloads,
} from '@/api/generated/reloads/reloads'
import { Button } from '@/components/button'
import { EmptyState } from '@/components/empty-state'
import { FormError } from '@/components/form-error'
import { Logo } from '@/components/logo'
import { formatChargeTime, formatDateTime, formatEnergy, formatMoney } from '@/lib/format'
import { useReloadDraft } from '@/stores/reload-draft'

export default function ReloadsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const clearDraft = useReloadDraft((state) => state.clear)
  const reloads = useGetReloads()
  const deleteReload = useDeleteReload()

  function newReload() {
    clearDraft()
    router.push('/reloads/new')
  }

  function confirmDelete(reload: GetReloads200ReloadsItem) {
    Alert.alert(
      'Excluir recarga',
      `Excluir a recarga em ${reload.chargePointName} de ${formatDateTime(reload.chargedAt)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReload.mutateAsync({ id: reload.id })
              await queryClient.invalidateQueries({ queryKey: getGetReloadsQueryKey() })
            } catch {
              Alert.alert('Não foi possível excluir', 'Tente novamente.')
            }
          },
        },
      ],
    )
  }

  return (
    // Tab-aware safe area: the list ends above the native tab bar, so the empty
    // state's button is not hidden behind it.
    <TabsSafeAreaView
      edges={{ top: true, bottom: true }}
      style={{ flex: 1, backgroundColor: '#f4f4f5' }}
    >
      <View className="flex-row items-center justify-between px-6 pb-4 pt-2">
        <Logo size="sm" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Registrar recarga"
          onPress={newReload}
          className="size-11 items-center justify-center rounded-full bg-brand active:bg-brand-pressed"
        >
          <Feather name="plus" size={22} color="#111827" />
        </Pressable>
      </View>

      {reloads.isPending ? (
        <ActivityIndicator className="mt-8" color="#22c55e" />
      ) : reloads.isError ? (
        <View className="gap-4 px-6">
          <FormError message="Não foi possível carregar suas recargas." />
          <Button title="Tentar novamente" onPress={() => reloads.refetch()} />
        </View>
      ) : (
        <FlatList
          data={reloads.data.reloads}
          keyExtractor={(reload) => reload.id}
          contentContainerClassName="grow gap-3 px-6 pb-8"
          contentInsetAdjustmentBehavior="never"
          refreshing={reloads.isRefetching}
          onRefresh={() => reloads.refetch()}
          ListHeaderComponent={
            reloads.data.reloads.length > 0 ? (
              <MonthSummary month={reloads.data.month} />
            ) : null
          }
          ListEmptyComponent={
            <View className="flex-1 gap-6">
              <EmptyState
                title="Nenhuma recarga registrada"
                description="Registre suas recargas para acompanhar tempo, energia e quanto você gastou."
              />
              <Button title="Registrar recarga" onPress={newReload} />
            </View>
          }
          renderItem={({ item }) => (
            <ReloadCard reload={item} onLongPress={() => confirmDelete(item)} />
          )}
        />
      )}
    </TabsSafeAreaView>
  )
}

function MonthSummary({
  month,
}: {
  month: { count: number; energyKwh: number; totalCents: number }
}) {
  return (
    <View className="mb-2 gap-3 rounded-2xl bg-ink p-5">
      <Text className="text-xs font-semibold uppercase text-brand">Este mês</Text>
      <View className="flex-row justify-between">
        <SummaryValue value={String(month.count)} label="recargas" />
        <SummaryValue value={formatEnergy(month.energyKwh)} label="energia" />
        <SummaryValue value={formatMoney(month.totalCents)} label="gastos" />
      </View>
    </View>
  )
}

function SummaryValue({ value, label }: { value: string; label: string }) {
  return (
    <View className="gap-0.5">
      <Text className="text-lg font-bold text-white">{value}</Text>
      <Text className="text-xs text-white/70">{label}</Text>
    </View>
  )
}

function ReloadCard({
  reload,
  onLongPress,
}: {
  reload: GetReloads200ReloadsItem
  onLongPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Segure para excluir"
      onLongPress={onLongPress}
      className="gap-2 rounded-2xl bg-white p-4 active:opacity-80"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-base font-bold text-ink" numberOfLines={1}>
            {reload.chargePointName}
          </Text>
          <Text className="text-xs text-muted">{formatDateTime(reload.chargedAt)}</Text>
        </View>
        <Text className="text-base font-bold text-brand-pressed">
          {reload.totalCents != null ? formatMoney(reload.totalCents) : 'Sem valor'}
        </Text>
      </View>
      <View className="flex-row gap-4">
        <Detail icon="clock" text={`${formatChargeTime(reload.durationMinutes)} h`} />
        <Detail
          icon="battery-charging"
          text={`${formatEnergy(reload.energyKwh)}${reload.energyEstimated ? ' (estimada)' : ''}`}
        />
      </View>
    </Pressable>
  )
}

function Detail({ icon, text }: { icon: 'clock' | 'battery-charging'; text: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <Feather name={icon} size={14} color="#6b7280" />
      <Text className="text-sm text-muted">{text}</Text>
    </View>
  )
}
