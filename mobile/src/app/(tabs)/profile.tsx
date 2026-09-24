import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { ActivityIndicator, Alert, Text, View } from 'react-native'
import { z } from 'zod'
import { Button } from '@/components/button'
import { FormError } from '@/components/form-error'
import { Logo } from '@/components/logo'
import { Screen } from '@/components/screen'
import { TextField } from '@/components/text-field'
import { api } from '@/lib/api'
import { authClient } from '@/lib/auth-client'
import { authErrorMessage } from '@/lib/auth-errors'

type Me = {
  id: string
  name: string
  email: string
  role: 'driver' | 'admin'
  createdAt: string
}

const nameSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome completo.'),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe sua senha atual.'),
    newPassword: z.string().min(8, 'A nova senha precisa ter pelo menos 8 caracteres.'),
    newPasswordConfirmation: z.string(),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirmation, {
    message: 'As senhas não conferem.',
    path: ['newPasswordConfirmation'],
  })

export default function ProfileScreen() {
  const queryClient = useQueryClient()
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/me') })

  if (me.isPending) {
    return (
      <Screen>
        <ActivityIndicator className="flex-1" color="#22c55e" />
      </Screen>
    )
  }

  if (me.isError) {
    return (
      <Screen>
        <View className="flex-1 justify-center gap-4">
          <FormError message="Não foi possível carregar seu perfil." />
          <Button title="Tentar novamente" onPress={() => me.refetch()} />
        </View>
      </Screen>
    )
  }

  return (
    <Screen>
      <View className="mb-6 flex-row items-center justify-between">
        <Logo size="sm" />
      </View>

      <View className="mb-8 gap-1">
        <Text className="text-2xl font-bold text-ink">{me.data.name}</Text>
        <Text className="text-base text-muted">{me.data.email}</Text>
        {me.data.role === 'admin' ? (
          <Text className="text-sm font-semibold text-brand-pressed">Administrador</Text>
        ) : null}
      </View>

      <View className="gap-10">
        <EditNameForm
          currentName={me.data.name}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['me'] })}
        />
        <ChangePasswordForm />
        <Button
          title="Sair"
          variant="danger"
          onPress={async () => {
            await authClient.signOut()
            queryClient.clear()
          }}
        />
      </View>
    </Screen>
  )
}

function EditNameForm({
  currentName,
  onSaved,
}: {
  currentName: string
  onSaved: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const { control, handleSubmit, formState, reset } = useForm({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: currentName },
  })

  useEffect(() => {
    reset({ name: currentName })
  }, [currentName, reset])

  async function onSubmit({ name }: z.infer<typeof nameSchema>) {
    setError(null)
    const { error } = await authClient.updateUser({ name })

    if (error) return setError(authErrorMessage(error))
    onSaved()
    Alert.alert('Pronto!', 'Seu nome foi atualizado.')
  }

  return (
    <View className="gap-4">
      <Text className="text-lg font-bold text-ink">Dados pessoais</Text>
      <TextField
        control={control}
        name="name"
        label="Nome"
        autoComplete="name"
        textContentType="name"
      />
      <FormError message={error} />
      <Button
        title="Salvar nome"
        loading={formState.isSubmitting}
        disabled={!formState.isDirty}
        onPress={handleSubmit(onSubmit)}
      />
    </View>
  )
}

function ChangePasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const { control, handleSubmit, formState, reset } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', newPasswordConfirmation: '' },
  })

  async function onSubmit({
    currentPassword,
    newPassword,
  }: z.infer<typeof passwordSchema>) {
    setError(null)
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    })

    if (error) return setError(authErrorMessage(error))
    reset()
    Alert.alert('Pronto!', 'Sua senha foi alterada.')
  }

  return (
    <View className="gap-4">
      <Text className="text-lg font-bold text-ink">Trocar senha</Text>
      <TextField
        control={control}
        name="currentPassword"
        label="Senha atual"
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
      />
      <TextField
        control={control}
        name="newPassword"
        label="Nova senha"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <TextField
        control={control}
        name="newPasswordConfirmation"
        label="Confirmar nova senha"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <FormError message={error} />
      <Button
        title="Trocar senha"
        variant="secondary"
        loading={formState.isSubmitting}
        onPress={handleSubmit(onSubmit)}
      />
    </View>
  )
}
