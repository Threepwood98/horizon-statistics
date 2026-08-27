import { LogoutButton } from "@/components/logout-button";
import { Separator } from "@/components/ui/separator";

interface DashboardHeaderProps {
  userName: string;
  teamName: string;
}

export function DashboardHeader({ userName, teamName }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Horizon Online Works</h1>
        <p className="text-muted-foreground">
          Bienvenido <span className="font-medium text-foreground">{userName}</span> · {teamName}
        </p>
      </div>
      <div className="flex items-center gap-3 mt-3 sm:mt-0">
        <LogoutButton />
      </div>
    </div>
  );
}
