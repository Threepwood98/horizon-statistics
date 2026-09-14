"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { LockIcon } from "lucide-react";
import { toast } from "sonner";

import { closeShift } from "@/lib/actions/reportes";
import { formatShortDate } from "@/lib/format";
import { type Shift } from "@/lib/shift";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function SiteHeader({
  date,
  shift,
  closed,
}: {
  date: string;
  shift: Shift;
  closed: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isClosed, setIsClosed] = React.useState(closed);
  const [isPending, startTransition] = useTransition();

  const title =
    pathname === "/"
      ? "Dashboard"
      : pathname === "/reportes"
        ? "Mis reportes"
        : pathname === "/aprobaciones"
          ? "Aprobaciones"
          : "Documents";

  const close = () => {
    startTransition(async () => {
      const result = await closeShift(date, shift);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setIsClosed(true);
      router.refresh();
    });
  };

  const turnoLabel = shift === "AM" ? "MAÑANA" : "TARDE";

  return (
    <header className="flex h-(--header-height) shrink-0 items-center border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="grid w-full grid-cols-3 items-center gap-2 px-4 lg:px-6">
        <div className="flex items-center gap-1 lg:gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 h-4 data-vertical:self-auto"
          />
          <h1 className="text-base font-medium">{title}</h1>
        </div>
        <span className="text-sm text-center text-muted-foreground">
          {formatShortDate(date)} · {turnoLabel}
        </span>
        <div className="flex justify-end">
          {isClosed ? (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <LockIcon className="size-4" /> Turno terminado
            </span>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={close}
              disabled={isPending}
            >
              {isPending ? <Spinner /> : <LockIcon />}
              {isPending ? "Terminando…" : "Terminar turno"}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
