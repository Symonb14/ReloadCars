import Feather from '@expo/vector-icons/Feather'
import { useQueryClient } from '@tanstack/react-query'
import * as Crypto from 'expo-crypto'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context'
import { withUniwind } from 'uniwind'
import {
  getGetPlaceQueryOptions,
  useGetPlaceSuggestions,
} from '@/api/generated/places/places'
import { FormError } from '@/components/form-error'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useRouteDestination } from '@/stores/route-destination'

const SafeAreaView = withUniwind(RNSafeAreaView)

const MIN_QUERY_LENGTH = 3

const TYPE_ICONS: Record<string, 'map-pin' | 'home' | 'navigation' | 'map'> = {
  poi: 'map-pin',
  address: 'home',
  street: 'navigation',
}

export default function SearchScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const setDestination = useRouteDestination((state) => state.setDestination)
  const { lat, lng } = useLocalSearchParams<{ lat?: string; lng?: string }>()

  // One Mapbox search session per time this screen is opened.
  const [sessionToken] = useState(() => Crypto.randomUUID())
  const [query, setQuery] = useState('')
  const [selectingId, setSelectingId] = useState<string | null>(null)
  const [selectError, setSelectError] = useState<string | null>(null)

  const debouncedQuery = useDebouncedValue(query.trim(), 300)
  const canSearch = debouncedQuery.length >= MIN_QUERY_LENGTH

  const suggestions = useGetPlaceSuggestions(
    {
      q: debouncedQuery,
      sessionToken,
      ...(lat && lng ? { lat: Number(lat), lng: Number(lng) } : {}),
    },
    { query: { enabled: canSearch, staleTime: 60_000, placeholderData: (prev) => prev } },
  )

  async function select(id: string) {
    setSelectError(null)
    setSelectingId(id)
    try {
      const place = await queryClient.fetchQuery(
        getGetPlaceQueryOptions(id, { sessionToken }),
      )
      setDestination({ kind: 'place', ...place })
      router.back()
    } catch {
      setSelectError('Não foi possível abrir este destino. Tente outro.')
    } finally {
      setSelectingId(null)
    }
  }

  const items = canSearch ? (suggestions.data?.suggestions ?? []) : []

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center gap-3 border-b border-field px-4 pb-3 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => router.back()}
          className="size-10 items-center justify-center rounded-full bg-surface active:opacity-80"
        >
          <Feather name="arrow-left" size={20} color="#111827" />
        </Pressable>
        <View className="h-11 flex-1 flex-row items-center gap-2 rounded-full bg-surface px-4">
          <Feather name="search" size={16} color="#6b7280" />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Para onde você vai?"
            placeholderTextColor="#9ca3af"
            returnKeyType="search"
            autoCorrect={false}
            className="flex-1 text-base text-ink"
          />
          {query ? (
            <Pressable accessibilityLabel="Limpar" onPress={() => setQuery('')}>
              <Feather name="x-circle" size={16} color="#9ca3af" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="px-4 py-2"
        ListHeaderComponent={
          <View className="gap-3 py-2">
            <FormError message={selectError} />
            {suggestions.isError && canSearch ? (
              <FormError message="Não foi possível buscar agora. Tente novamente." />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <SearchHint
            loading={canSearch && suggestions.isFetching}
            empty={canSearch && suggestions.isSuccess}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            disabled={selectingId !== null}
            onPress={() => select(item.id)}
            className="flex-row items-center gap-3 border-b border-surface py-3 active:opacity-60"
          >
            <View className="size-9 items-center justify-center rounded-full bg-surface">
              <Feather name={TYPE_ICONS[item.type] ?? 'map'} size={16} color="#16a34a" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-ink" numberOfLines={1}>
                {item.name}
              </Text>
              {item.address ? (
                <Text className="text-sm text-muted" numberOfLines={1}>
                  {item.address}
                </Text>
              ) : null}
            </View>
            {selectingId === item.id ? <ActivityIndicator color="#22c55e" /> : null}
          </Pressable>
        )}
        ListFooterComponent={
          items.length > 0 ? (
            <Text className="py-4 text-center text-[10px] text-muted">© Mapbox</Text>
          ) : null
        }
      />
    </SafeAreaView>
  )
}

function SearchHint({ loading, empty }: { loading: boolean; empty: boolean }) {
  if (loading) {
    return <ActivityIndicator className="mt-8" color="#22c55e" />
  }

  return (
    <View className="mt-8 items-center gap-2 px-6">
      <Feather name="map" size={28} color="#9ca3af" />
      <Text className="text-center text-base text-muted">
        {empty
          ? 'Nenhum lugar encontrado. Tente o nome de outro local ou um endereço.'
          : 'Digite um endereço, bairro ou estabelecimento para ver a rota e os pontos de recarga no caminho.'}
      </Text>
    </View>
  )
}
