import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { localDateKey, utcStart } from "@/lib/range";
import { shiftFromDate } from "@/lib/shift";
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

  const dateKey = localDateKey(new Date());
  const shift = shiftFromDate(new Date());
  const turnoClose = await prisma.turnoClose.findUnique({
    where: { userId_date_shift: { userId: user.id, date: utcStart(dateKey), shift } },
  });

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
        <SiteHeader date={dateKey} shift={shift} closed={Boolean(turnoClose)} />
        <div className="flex min-h-svh flex-col bg-background p-6 md:p-10">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}