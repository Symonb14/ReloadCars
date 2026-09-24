import Feather from '@expo/vector-icons/Feather'
import { Pressable, Text } from 'react-native'

/** Looks like an input; opens the destination search screen. */
export function SearchBar({ label, onPress }: { label?: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="search"
      accessibilityLabel={
        label ? `Destino: ${label}. Toque para mudar` : 'Para onde você vai?'
      }
      onPress={onPress}
      className="h-12 w-full flex-row items-center gap-3 rounded-full bg-white px-5 shadow-lg active:opacity-90"
    >
      <Feather name="search" size={18} color="#16a34a" />
      <Text
        className={`flex-1 text-base ${label ? 'font-semibold text-ink' : 'text-muted'}`}
        numberOfLines={1}
      >
        {label ?? 'Para onde você vai?'}
      </Text>
    </Pressable>
  )
}
