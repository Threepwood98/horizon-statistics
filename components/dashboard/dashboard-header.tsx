import Link from "next/link";
import { PlusIcon, InboxIcon } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface DashboardHeaderProps {
  userName: string;
  teamName: string;
  role?: string;
}

export function DashboardHeader({
  userName,
  teamName,
  role,
}: DashboardHeaderProps) {
  const canApprove = role === "leader" || role === "manager" || role === "admin";

  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Horizon Online Works</h1>
        <p className="text-muted-foreground">
          Bienvenido <span className="font-medium text-foreground">{userName}</span> ·{" "}
          {teamName || "Administración"}
        </p>
      </div>
      <div className="flex items-center gap-3 mt-3 sm:mt-0">
        {canApprove && (
          <>
            <Link href="/aprobaciones">
              <Button variant="outline" size="sm">
                <InboxIcon />
                Aprobaciones
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-6" />
          </>
        )}
        <Link href="/reportes">
          <Button size="sm">
            <PlusIcon />
            Nuevo reporte
          </Button>
        </Link>
        <LogoutButton />
      </div>
    </div>
  );
}
