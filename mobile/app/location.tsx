import { View, Text } from 'react-native'
import {
  requestBackgroundPermissionsAsync,
  getCurrentPositionAsync,
  LocationObject,
} from 'expo-location'
import { useEffect, useState } from 'react'

export default function Location() {
  const [location, setLocation] = useState<LocationObject | null>(null)

  async function requestLocationPermissions() {
    const { granted } = await requestBackgroundPermissionsAsync()

    if (granted) {
      const currentPosition = await getCurrentPositionAsync()
      setLocation(currentPosition)
      console.log(location)
    }
  }

  useEffect(() => {
    requestLocationPermissions()
  }, [])

  return (
    <View>
      <Text>Hello World</Text>
    </View>
  )
}
