import Feather from '@expo/vector-icons/Feather'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Pressable, Text, View } from 'react-native'
import { z } from 'zod'
import { Button } from '@/components/button'
import { FormError } from '@/components/form-error'
import { Logo } from '@/components/logo'
import { Screen } from '@/components/screen'
import { TextField } from '@/components/text-field'
import { authClient } from '@/lib/auth-client'
import { authErrorMessage } from '@/lib/auth-errors'

const signUpSchema = z
  .object({
    name: z.string().trim().min(2, 'Informe seu nome completo.'),
    email: z.email('Informe um e-mail válido.'),
    password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.'),
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'As senhas não conferem.',
    path: ['passwordConfirmation'],
  })

type SignUpForm = z.infer<typeof signUpSchema>

export default function SignUpScreen() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const { control, handleSubmit, formState } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '', passwordConfirmation: '' },
  })

  async function onSubmit({ name, email, password }: SignUpForm) {
    setError(null)
    const { error } = await authClient.signUp.email({
      name,
      email: email.trim().toLowerCase(),
      password,
    })

    // Sign-up also signs in; Stack.Protected then switches to the tabs.
    if (error) setError(authErrorMessage(error))
  }

  return (
    <Screen>
      <View className="mb-8 flex-row items-center justify-between">
        <Logo size="sm" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => router.back()}
          className="size-10 items-center justify-center rounded-full bg-brand active:bg-brand-pressed"
        >
          <Feather name="arrow-left" size={20} color="#111827" />
        </Pressable>
      </View>

      <Text className="mb-6 text-2xl font-bold text-ink">Criar conta</Text>

      <View className="gap-4">
        <TextField
          control={control}
          name="name"
          label="Nome"
          placeholder="Digite o seu nome completo"
          autoComplete="name"
          textContentType="name"
        />
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
          placeholder="Mínimo de 8 caracteres"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <TextField
          control={control}
          name="passwordConfirmation"
          label="Confirmar senha"
          placeholder="Digite a senha novamente"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          onSubmitEditing={handleSubmit(onSubmit)}
        />
        <FormError message={error} />
        <Button
          title="Salvar"
          className="mt-2"
          loading={formState.isSubmitting}
          onPress={handleSubmit(onSubmit)}
        />
      </View>
    </Screen>
  )
}
