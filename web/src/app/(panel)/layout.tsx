'use client'

import { useQueryClient } from '@tanstack/react-query'
import { usePathname, useRouter } from 'next/navigation'
import { type ReactNode, useEffect } from 'react'
import { ApiError } from '@/api/fetcher'
import { useGetMe } from '@/api/generated/profile/profile'
import { AppSidebar } from '@/components/panel/app-sidebar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { authClient } from '@/lib/auth-client'

const sectionTitles: [prefix: string, title: string][] = [
  ['/charge-points/new', 'Novo ponto de recarga'],
  ['/charge-points/', 'Editar ponto de recarga'],
  ['/charge-points', 'Pontos de recarga'],
  ['/partners', 'Parceiros'],
]

export default function PanelLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const me = useGetMe()

  const unauthenticated = me.error instanceof ApiError && me.error.status === 401

  useEffect(() => {
    if (unauthenticated) router.replace('/login')
  }, [unauthenticated, router])

  async function signOut() {
    await authClient.signOut()
    queryClient.clear()
    router.replace('/login')
  }

  if (me.isPending || unauthenticated) {
    return (
      <div className="flex flex-1">
        <Skeleton className="hidden w-64 rounded-none md:block" />
        <div className="grid flex-1 content-start gap-4 p-8">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (me.isError) {
    return (
      <CenteredMessage
        title="Não foi possível carregar o painel"
        description="Verifique se a API está rodando e tente novamente."
        action={<Button onClick={() => me.refetch()}>Tentar novamente</Button>}
      />
    )
  }

  if (me.data.role !== 'admin') {
    return (
      <CenteredMessage
        title="Acesso restrito a administradores"
        description={`Você entrou como ${me.data.email}, que é uma conta de motorista. Use o app ReloadCars no celular.`}
        action={<Button onClick={signOut}>Sair</Button>}
      />
    )
  }

  const section =
    pathname === '/'
      ? 'Visão geral'
      : (sectionTitles.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? '')

  return (
    <SidebarProvider>
      <AppSidebar user={me.data} onSignOut={signOut} />
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-muted-foreground text-sm">ReloadCars</span>
          <span className="text-muted-foreground text-sm">/</span>
          <span className="font-medium text-sm">{section}</span>
        </header>
        <main className="mx-auto grid w-full max-w-6xl content-start gap-6 p-6 md:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function CenteredMessage({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action: ReactNode
}) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{action}</CardContent>
      </Card>
    </main>
  )
}
