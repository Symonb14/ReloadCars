'use client'

import { LayoutDashboardIcon, LogOutIcon, PlugZapIcon, StoreIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { initials } from '@/lib/format'

const navigation = [
  { href: '/', label: 'Visão geral', icon: LayoutDashboardIcon },
  { href: '/partners', label: 'Parceiros', icon: StoreIcon },
  { href: '/charge-points', label: 'Pontos de recarga', icon: PlugZapIcon },
]

type AppSidebarProps = {
  user: { name: string; email: string }
  onSignOut: () => void
}

export function AppSidebar({ user, onSignOut }: AppSidebarProps) {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              {/* The logo has dark wheels: keep it on a white tile over the dark sidebar. */}
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white">
                <Image src="/logo.png" alt="" width={24} height={17} />
              </span>
              <span className="grid leading-tight">
                <span className="font-semibold text-sidebar-accent-foreground">
                  ReloadCars
                </span>
                <span className="text-xs">Painel admin</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Gestão</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(item.href)}
                    tooltip={item.label}
                    render={<Link href={item.href} />}
                    // Active: lighter ink with a green icon (a full green fill is too loud).
                    className="data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-accent-foreground data-active:[&>svg]:text-sidebar-primary"
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 rounded-lg p-2 group-data-[collapsible=icon]:p-0">
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-sidebar-accent text-sidebar-accent-foreground text-xs">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium text-sidebar-accent-foreground text-sm">
                  {user.name}
                </span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sair" onClick={onSignOut}>
              <LogOutIcon />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
