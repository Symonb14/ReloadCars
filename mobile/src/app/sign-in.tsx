import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Text, View } from 'react-native'
import { z } from 'zod'
import { Button } from '@/components/button'
import { FormError } from '@/components/form-error'
import { Logo } from '@/components/logo'
import { Screen } from '@/components/screen'
import { TextField } from '@/components/text-field'
import { authClient } from '@/lib/auth-client'
import { authErrorMessage } from '@/lib/auth-errors'

const signInSchema = z.object({
  email: z.email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
})

type SignInForm = z.infer<typeof signInSchema>

export default function SignInScreen() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const { control, handleSubmit, formState } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit({ email, password }: SignInForm) {
    setError(null)
    const { error } = await authClient.signIn.email({
      email: email.trim().toLowerCase(),
      password,
    })

    // On success the session updates and Stack.Protected switches to the tabs.
    if (error) setError(authErrorMessage(error))
  }

  return (
    <Screen>
      <View className="flex-1 justify-center gap-10">
        <View className="items-center gap-2">
          <Logo />
          <Text className="text-2xl font-bold text-ink">ReloadCars</Text>
          <Text className="text-base text-muted">Seja bem-vindo!</Text>
        </View>

        <View className="gap-4">
          <TextField
            control={control}
            name="email"
            label="E-mail"
            placeholder="Digite o seu e-mail"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <TextField
            control={control}
            name="password"
            label="Senha"
            placeholder="Digite a sua senha"
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={handleSubmit(onSubmit)}
          />
          <FormError message={error} />
        </View>

        <View className="gap-3">
          <Button
            title="Começar sua recarga!"
            loading={formState.isSubmitting}
            onPress={handleSubmit(onSubmit)}
          />
          <Button
            title="Criar conta"
            variant="secondary"
            onPress={() => router.push('/sign-up')}
          />
        </View>
      </View>
    </Screen>
  )
}
