'use client'

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/Sidebar'
import { UserMenu } from '@/components/user-menu'
import { useAuth } from '@/components/providers/auth-provider'

function DashboardHeader() {
  const { user } = useAuth()

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <div>
          <p className="text-xl font-medium text-primary">Welcome back</p>
          <p className="text-sm text-muted-foreground">
            {user?.name ?? 'Signed-in workspace navigation'}
          </p>
        </div>
      </div>

      <UserMenu />
    </div>
  )
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset className="min-h-screen bg-background">
        <DashboardHeader />

        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
