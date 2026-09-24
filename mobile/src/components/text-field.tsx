import {
  type Control,
  Controller,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'
import { Text, TextInput, type TextInputProps, View } from 'react-native'

type TextFieldProps<T extends FieldValues> = Omit<TextInputProps, 'value'> & {
  control: Control<T>
  name: FieldPath<T>
  label: string
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  ...inputProps
}: TextFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
        <View className="gap-1.5">
          <Text className="text-xs font-semibold uppercase text-ink">{label}</Text>
          <TextInput
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholderTextColor="#9ca3af"
            className={`h-12 rounded-lg bg-field px-4 text-base text-ink ${error ? 'border border-danger' : ''}`}
            {...inputProps}
          />
          {error?.message ? (
            <Text className="text-xs text-danger">{error.message}</Text>
          ) : null}
        </View>
      )}
    />
  )
}
