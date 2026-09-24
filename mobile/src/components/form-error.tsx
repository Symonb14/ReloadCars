import { Text } from 'react-native'

export function FormError({ message }: { message: string | null }) {
  if (!message) return null

  return (
    <Text
      accessibilityRole="alert"
      className="rounded-lg bg-danger/10 p-3 text-sm text-danger"
    >
      {message}
    </Text>
  )
}
