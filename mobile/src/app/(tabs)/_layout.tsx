import { NativeTabs } from 'expo-router/unstable-native-tabs'

// Both states need explicit colors: with only `tintColor` (selected), iOS renders the
// normal and selected icons in different modes and, on the iOS 26 glass tab bar, the
// selected tab showed an empty pill. The darker green keeps contrast on the light glass.
const COLORS = { selected: '#16a34a', default: '#6b7280' }

export default function TabsLayout() {
  return (
    <NativeTabs
      tintColor={COLORS.selected}
      iconColor={{ default: COLORS.default, selected: COLORS.selected }}
      labelStyle={{
        default: { color: COLORS.default },
        selected: { color: COLORS.selected },
      }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="list.bullet" md="list" />
        <NativeTabs.Trigger.Label>Recargas</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="map">
        <NativeTabs.Trigger.Icon sf="map" md="map" />
        <NativeTabs.Trigger.Label>Localização</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="person" />
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
