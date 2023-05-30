import { TextInput } from 'react-native'

export function Input() {
  return (
    <TextInput
      className="h-14 border-gray-600 bg-gray-800 px-4 text-base focus:border-gray-600 focus:bg-gray-800"
      placeholder="Tempo de recarga"
      placeholderTextColor="#56565a"
    />
  )
}
