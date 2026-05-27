"use client"

import Link from "next/link"

import { getPersistedRole } from "@/lib/auth-role"
import { useAuth } from "@/components/providers/auth-provider"
import {
  BarChart3,
  CheckCircle2,
  FileText,
  LayoutDashboard,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
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
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Create Assessments", href: "/create-assessments", icon: FileText },
  { title: "Attend Assessments", href: "/attend-assessments", icon: CheckCircle2 },
  { title: "Results", href: "/result", icon: BarChart3 },
]

export function AppSidebar() {
  const { user } = useAuth()

  const role = getPersistedRole(user)
  const isTeacher = role === "teacher"

  const visibleNavItems = navItems.filter((item) => {
    if (item.href !== "/create-assessments") {
      return true
    }

    return isTeacher
  }).map((item) => {
    if (item.href === "/result" && isTeacher) {
      return { ...item, title: "Papers Generated" }
    }
    return item
  })

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border">
        <div className="flex items-center justify-between px-2 py-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold">
              AM
            </div>
            <div>
              <p className="text-sm font-semibold">AssessMind AI</p>
              <p className="text-xs text-muted-foreground">Workspace</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => {
                const Icon = item.icon

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild>
                      <Link href={item.href}>
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
