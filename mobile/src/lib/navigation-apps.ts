import { ActionSheetIOS, Alert, Linking, Platform } from 'react-native'

type Destination = { latitude: number; longitude: number; name: string }

// Universal links: open the app when installed, otherwise the browser.
const apps = [
  {
    label: 'Apple Maps',
    platforms: ['ios'],
    url: ({ latitude, longitude, name }: Destination) =>
      `https://maps.apple.com/?daddr=${latitude},${longitude}&q=${encodeURIComponent(name)}&dirflg=d`,
  },
  {
    label: 'Google Maps',
    platforms: ['ios', 'android'],
    url: ({ latitude, longitude }: Destination) =>
      `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`,
  },
  {
    label: 'Waze',
    platforms: ['ios', 'android'],
    url: ({ latitude, longitude }: Destination) =>
      `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`,
  },
]

function open(url: string) {
  Linking.openURL(url).catch(() =>
    Alert.alert('Não foi possível abrir', 'Tente outro aplicativo de navegação.'),
  )
}

/** Asks which navigation app to use and opens it with directions to the point (RF10). */
export function chooseNavigationApp(destination: Destination) {
  const available = apps.filter((app) => app.platforms.includes(Platform.OS))
  const title = 'Como chegar'
  const message = `Abrir a rota até ${destination.name} em:`

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        message,
        options: [...available.map((app) => app.label), 'Cancelar'],
        cancelButtonIndex: available.length,
      },
      (index) => {
        const app = available[index]
        if (app) open(app.url(destination))
      },
    )
    return
  }

  Alert.alert(title, message, [
    ...available.map((app) => ({
      text: app.label,
      onPress: () => open(app.url(destination)),
    })),
    { text: 'Cancelar', style: 'cancel' as const },
  ])
}
