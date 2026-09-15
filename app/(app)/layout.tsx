import { getCurrentUser, getTurnoClosed } from "@/lib/session";
import { localDateKey } from "@/lib/range";
import { shiftFromDate } from "@/lib/shift";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeader } from "@/components/layout/site-header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getCurrentUser();

  const dateKey = localDateKey(new Date());
  const shift = shiftFromDate(new Date());
  const closed = await getTurnoClosed(user.id, dateKey, shift);

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
        <SiteHeader date={dateKey} shift={shift} closed={closed} />
        <div className="flex min-h-svh flex-col bg-background p-6 md:p-10">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}