"use client"

import * as React from "react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { EllipsisVerticalIcon, CircleUserRoundIcon, CreditCardIcon, BellIcon, LogOutIcon } from "lucide-react"

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

export function NavUser({
  user,
  onLogout,
}: {
  user: {
    name: string
    email: string
    avatar?: string
  }
  onLogout?: () => void
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)
  const initials = getInitials(user.name)

  async function handleLogout() {
    if (onLogout) {
      onLogout()
      return
    }
    setBusy(true)
    await authClient.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            {user.avatar ? (
              <Avatar className="size-8 rounded-lg grayscale">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
            ) : (
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
            )}
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-foreground/70">
                {user.email}
              </span>
            </div>
            <EllipsisVerticalIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  {user.avatar ? (
                    <Avatar className="size-8">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <Avatar className="size-8">
                      <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <CircleUserRoundIcon
                />
                Cuenta
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCardIcon
                />
                Facturación
              </DropdownMenuItem>
              <DropdownMenuItem>
                <BellIcon
                />
                Notificaciones
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={busy} onSelect={handleLogout}>
              <LogOutIcon
              />
              {busy ? "Saliendo..." : "Cerrar sesión"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}