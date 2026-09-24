import { Image } from 'expo-image'

const sizes = { sm: { width: 72, height: 51 }, lg: { width: 114, height: 81 } }

export function Logo({ size = 'lg' }: { size?: keyof typeof sizes }) {
  return (
    <Image
      source={require('@/assets/images/logo.png')}
      style={sizes[size]}
      contentFit="contain"
      accessibilityLabel="ReloadCars"
    />
  )
}
