"use client";

import * as React from "react";

import { NavMain } from "@/components/layout/nav-main";
import { NavUser } from "@/components/layout/nav-user";
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
import Link from "next/link";
import { canApproveRole } from "@/lib/roles";

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
  const canApprove = canApproveRole(role ?? "");

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
              render={<Link href="/" />}
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