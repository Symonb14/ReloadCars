'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'

const loginSchema = z.object({
  email: z.email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  async function onSubmit({ email, password }: LoginForm) {
    setError(null)
    const { error } = await authClient.signIn.email({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error) {
      setError(
        error.code === 'INVALID_EMAIL_OR_PASSWORD'
          ? 'E-mail ou senha incorretos.'
          : 'Não foi possível entrar. Tente novamente.',
      )
      return
    }

    router.replace('/partners')
    router.refresh()
  }

  return (
    <main className="grid flex-1 lg:grid-cols-2">
      {/* Brand panel: same ink + green as the app. */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white">
            <Image src="/logo.png" alt="" width={30} height={21} priority />
          </span>
          <span className="font-semibold text-lg text-sidebar-accent-foreground">
            ReloadCars
          </span>
        </div>
        <div className="grid max-w-md gap-4">
          <h1 className="font-semibold text-4xl text-sidebar-accent-foreground leading-tight tracking-tight">
            Mais pontos de recarga no mapa de quem dirige elétrico.
          </h1>
          <p className="text-lg">
            Gerencie parceiros e pontos de recarga exibidos no app ReloadCars.
          </p>
        </div>
        <p className="text-sm">Painel administrativo</p>
        <div
          aria-hidden
          className="-right-24 -bottom-24 pointer-events-none absolute size-96 rounded-full bg-sidebar-primary/20 blur-3xl"
        />
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="grid w-full max-w-sm gap-8">
          <div className="grid gap-2">
            <span className="flex size-12 items-center justify-center rounded-xl border bg-card lg:hidden">
              <Image src="/logo.png" alt="" width={34} height={24} />
            </span>
            <h2 className="font-semibold text-2xl tracking-tight">Entrar no painel</h2>
            <p className="text-muted-foreground">Acesso restrito a administradores.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@reloadcars.com"
                className="h-10"
                aria-invalid={Boolean(errors.email)}
                {...register('email')}
              />
              {errors.email ? (
                <p className="text-destructive text-sm">{errors.email.message}</p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                className="h-10"
                aria-invalid={Boolean(errors.password)}
                {...register('password')}
              />
              {errors.password ? (
                <p className="text-destructive text-sm">{errors.password.message}</p>
              ) : null}
            </div>
            {error ? (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm"
              >
                {error}
              </p>
            ) : null}
            <Button type="submit" size="lg" className="h-10" disabled={isSubmitting}>
              {isSubmitting ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </div>
      </section>
    </main>
  )
}
