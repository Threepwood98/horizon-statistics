"use client";

import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  LayoutDashboardIcon,
  CommandIcon,
  ClipboardListIcon,
  BadgeCheckIcon,
} from "lucide-react";

export function AppSidebar({
  user,
  role,
  appTitle = "Horizon Online Works",
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user?: { name: string; email: string };
  role?: string;
  appTitle?: string;
}) {
  const canApprove =
    role === "leader" || role === "manager" || role === "admin";

  const realNav = [
    {
      title: "Dashboard",
      url: "/",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Reportes",
      url: "/reportes",
      icon: <ClipboardListIcon />,
    },
    ...(canApprove
      ? [
          {
            title: "Aprobaciones",
            url: "/aprobaciones",
            icon: <BadgeCheckIcon />,
          },
        ]
      : []),
  ];

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<a href="/" />}
            >
              <CommandIcon className="size-5!" />
              <span className="text-base font-semibold">{appTitle}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={realNav} />
      </SidebarContent>
      <SidebarFooter>{user ? <NavUser user={user} /> : null}</SidebarFooter>
    </Sidebar>
  );
}
