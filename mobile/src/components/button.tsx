import { ActivityIndicator, Pressable, type PressableProps, Text } from 'react-native'

const variants = {
  primary: {
    container: 'bg-brand active:bg-brand-pressed',
    text: 'text-ink',
    spinner: '#111827',
  },
  secondary: {
    container: 'bg-ink active:opacity-80',
    text: 'text-brand',
    spinner: '#22c55e',
  },
  danger: {
    container: 'bg-danger active:opacity-80',
    text: 'text-white',
    spinner: '#ffffff',
  },
} as const

type ButtonProps = PressableProps & {
  title: string
  variant?: keyof typeof variants
  loading?: boolean
}

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const styles = variants[variant]
  const isDisabled = disabled || loading

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      className={`h-12 items-center justify-center rounded-full px-6 disabled:opacity-60 ${styles.container} ${className ?? ''}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={styles.spinner} />
      ) : (
        <Text className={`text-sm font-bold uppercase ${styles.text}`}>{title}</Text>
      )}
    </Pressable>
  )
}
