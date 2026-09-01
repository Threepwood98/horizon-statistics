import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) redirect("/login");

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        user={{ name: user.name ?? "", email: user.email ?? "" }}
        role={user.role}
        appTitle="Horizon Online Works"
      />
      <SidebarInset>
        <SiteHeader />
        <div className="flex min-h-svh flex-col bg-background p-6 md:p-10">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}