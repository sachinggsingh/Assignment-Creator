"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { getPersistedRole } from "@/lib/auth-role"
import { useAuth } from "@/components/providers/auth-provider"

import {
  BarChart3,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  LogOut,
} from "lucide-react"

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
} from "@/components/ui/sidebar"

import { ThemeToggle } from "@/components/theme-toggle"

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Create Assessments",
    href: "/create-assessments",
    icon: FileText,
  },
  {
    title: "Attend Assessments",
    href: "/attend-assessments",
    icon: CheckCircle2,
  },
  {
    title: "Results",
    href: "/result",
    icon: BarChart3,
  },
]

export function AppSidebar() {
  const { user, signOut } = useAuth()

  const router = useRouter()

  const role = getPersistedRole(user)

  const isTeacher = role === "teacher"

  const visibleNavItems = navItems
    .filter((item) => {
      if (
        item.href !== "/create-assessments"
      ) {
        return true
      }

      return isTeacher
    })
    .map((item) => {
      if (item.href === "/result" && isTeacher) {
        return { ...item, title: "Papers Generated" }
      }

      if (item.href === "/attend-assessments" && isTeacher) {
        return { ...item, title: "See Assessment" }
      }

      return item
    })

  const handleSignOut = async () => {
    await signOut()

    router.replace("/sign-in")
  }

  return (
    <Sidebar collapsible="icon">
<SidebarHeader className="border-b border-border">
  <div className="flex items-center justify-between px-2 py-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
    <div className="flex items-center gap-3 overflow-hidden group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full">
      <div className="flex h-10 w-10 min-w-[40px] flex-shrink-0 items-center justify-center rounded-full bg-black font-bold text-white dark:bg-white dark:text-black">
        V
      </div>
      <div className="flex flex-col min-w-0 overflow-hidden group-data-[collapsible=icon]:hidden">
        <p className="truncate text-base font-semibold">VedaAI</p>
        <p className="truncate text-sm text-muted-foreground">Workspace</p>
      </div>
    </div>
    <div className="group-data-[collapsible=icon]:hidden">
      <ThemeToggle />
    </div>
  </div>
</SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            Navigation
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => {
                const Icon = item.icon

                return (
                  <SidebarMenuItem
                    key={item.href}
                  >
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
<Icon className="h-4 w-4 shrink-0" />
                        <span className="group-data-[collapsible=icon]:hidden">
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign out"
              variant="outline"
              className="hover:bg-destructive hover:text-white hover:cursor-pointer"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 shrink-0" />

              <span className="group-data-[collapsible=icon]:hidden">
                Sign out
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}