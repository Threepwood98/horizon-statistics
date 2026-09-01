import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeftIcon, ClipboardListIcon, ClockIcon } from "lucide-react";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { toKey, utcStart, formatDateLabelUTC } from "@/lib/range";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DateSwitcher } from "@/components/reportes/date-switcher";
import { ReportDialog } from "@/components/reportes/report-dialog";
import { DraftList } from "@/components/reportes/draft-list";
import { SentReports } from "@/components/reportes/sent-reports";

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const sp = await searchParams;
  const dateKey =
    sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : toKey(new Date());
  const dateStart = utcStart(dateKey);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { team: true },
  });
  if (!user) redirect("/login");

  const [websites, drafts, sentList, acceptedList] = await Promise.all([
    prisma.website.findMany({ orderBy: { name: "asc" } }),
    prisma.dailyReport.findMany({
      where: { userId: user.id, date: dateStart, status: "draft" },
      include: { website: true },
      orderBy: { id: "asc" },
    }),
    prisma.dailyReport.findMany({
      where: { userId: user.id, date: dateStart, status: "sent" },
      include: { website: true },
      orderBy: { id: "asc" },
    }),
    prisma.dailyReport.findMany({
      where: { userId: user.id, date: dateStart, status: "accepted" },
      include: { website: true },
      orderBy: { id: "asc" },
    }),
  ]);

  const draftRows = drafts.map((r) => ({
    id: Number(r.id),
    site: r.website?.name ?? "Sin sitio",
    start: Number(r.startAmount),
    end: Number(r.endAmount),
    rejectionNote: r.rejectionNote,
  }));

  const rejected = draftRows.filter((d) => d.rejectionNote);

  const sentRows = sentList.map((r) => ({
    site: r.website?.name ?? "Sin sitio",
    start: Number(r.startAmount),
    end: Number(r.endAmount),
  }));

  const acceptedRows = acceptedList.map((r) => ({
    site: r.website?.name ?? "Sin sitio",
    start: Number(r.startAmount),
    end: Number(r.endAmount),
  }));

  const userName = user.displayUsername || user.name;
  const teamName = user.team?.name ?? "Sin equipo";

  return (
    <div className="flex min-h-svh flex-col bg-background p-6 md:p-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon />
        Dashboard
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ClipboardListIcon />
            Mis reportes
          </h1>
          <p className="text-muted-foreground">
            {userName} · {teamName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ReportDialog
            websites={websites.map((w) => ({ id: Number(w.id), name: w.name }))}
            date={dateKey}
            rangeLabel={formatDateLabelUTC(dateKey)}
          />
          <DateSwitcher value={dateKey} />
        </div>
      </div>

      {rejected.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <ClipboardListIcon />
              Rechazado por el manager
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DraftList drafts={draftRows} date={dateKey} showRejection />
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Borradores del día</CardTitle>
            <CardDescription>
              Reportes cargados que todavía no enviaste.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DraftList drafts={draftRows} date={dateKey} />
          </CardContent>
        </Card>

        {sentRows.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClockIcon />
                En revisión
              </CardTitle>
              <CardDescription>
                Enviados al manager y pendientes de aprobación.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SentReports reports={sentRows} date={dateKey} showHeader={false} />
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-6 max-w-2xl">
        <SentReports
          reports={acceptedRows}
          workerName={userName}
          teamName={teamName}
          date={dateKey}
          accepted
        />
      </div>
    </div>
  );
}
