import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  CheckCircle2Icon,
  ClipboardCheckIcon,
  ClipboardClockIcon,
  ClipboardIcon,
  ClipboardListIcon,
  ClipboardPlusIcon,
  XCircleIcon,
} from "lucide-react";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  utcStart,
  formatDateLabelUTC,
  localDateKey,
  getRange,
  toKey,
} from "@/lib/range";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DateSwitcher } from "@/components/reportes/date-switcher";
import { ReportDialog } from "@/components/reportes/report-dialog";
import { DraftList } from "@/components/reportes/draft-list";
import { SentReports } from "@/components/reportes/sent-reports";
import { RejectedReportDialog } from "@/components/reportes/rejected-report-dialog";
import { AcceptedHistory } from "@/components/reportes/accepted-history";

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    range?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const sp = await searchParams;
  const dateKey =
    sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date)
      ? sp.date
      : localDateKey(new Date());
  const dateStart = utcStart(dateKey);
  const now = new Date();
  const { range, where, from, to } = {
    ...getRange(sp, now),
    from: sp.from,
    to: sp.to,
  };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { team: true },
  });
  if (!user) redirect("/login");

  const role = user.role;
  const isGlobal = role === "manager" || role === "admin";

  const [websites, balances, drafts, sentList, acceptedHistory] =
    await Promise.all([
      prisma.website.findMany({ orderBy: { name: "asc" } }),
      user.teamId != null
        ? prisma.balance.findMany({
            where: { teamId: user.teamId },
            select: { websiteId: true, balance: true },
          })
        : Promise.resolve([]),
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
        where: {
          ...(isGlobal ? {} : { userId: user.id }),
          date: where,
          status: "accepted",
        },
        include: {
          website: true,
          user: { include: { team: true } },
        },
        orderBy: [{ date: "desc" }, { id: "asc" }],
      }),
    ]);

  const balanceBySite = new Map<bigint, number>();
  for (const b of balances) {
    balanceBySite.set(b.websiteId, Number(b.balance));
  }

  const temporalesBySite = new Map<bigint, number>();
  for (const r of [...drafts, ...sentList]) {
    if (r.websiteId == null) continue;
    const prev = temporalesBySite.get(r.websiteId) ?? 0;
    temporalesBySite.set(r.websiteId, prev + Number(r.amount));
  }

  const sites = websites.map((w) => {
    const approved = balanceBySite.get(w.id) ?? 0;
    const partial = temporalesBySite.get(w.id) ?? 0;
    const balanceInicio = Math.round((approved + partial) * 100) / 100;
    return { id: Number(w.id), name: w.name, balanceInicio };
  });

  const draftRows = drafts.map((r) => ({
    id: Number(r.id),
    websiteId: r.websiteId != null ? Number(r.websiteId) : null,
    site: r.website?.name ?? "Sin sitio",
    amount: Number(r.amount),
    rejectionNote: r.rejectionNote,
  }));

  const partialRows = draftRows.filter((d) => !d.rejectionNote);
  const rejectedRows = draftRows
    .filter((d) => d.rejectionNote)
    .filter((d): d is typeof d & { websiteId: number } => d.websiteId != null);

  const sentRows = sentList.map((r) => ({
    site: r.website?.name ?? "Sin sitio",
    amount: Number(r.amount),
  }));

  type AcceptedGroup = {
    id: string;
    userName: string;
    teamName: string;
    dateKey: string;
    totalAmount: number;
    sites: { site: string; amount: number }[];
  };

  const acceptedGroups = Array.from(
    acceptedHistory.reduce((map, r) => {
      const currentUser = r.user;
      const key = `${r.userId}:${toKey(r.date)}`;
      const existing = map.get(key);
      const entry = {
        site: r.website?.name ?? "Sin sitio",
        amount: Number(r.amount),
      };
      if (existing) {
        existing.totalAmount += entry.amount;
        existing.sites.push(entry);
      } else {
        map.set(key, {
          id: key,
          userName:
            currentUser?.displayUsername || currentUser?.name || "Usuario",
          teamName: currentUser?.team?.name ?? "Sin equipo",
          dateKey: toKey(r.date),
          totalAmount: entry.amount,
          sites: [entry],
        });
      }
      return map;
    }, new Map<string, AcceptedGroup>()),
    ([, a]) => a,
  ).sort((a, b) =>
    a.dateKey < b.dateKey ? 1 : a.dateKey > b.dateKey ? -1 : 0,
  );

  return (
    <div className="flex flex-col">
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ClipboardListIcon />
            Mis reportes
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <ReportDialog
            sites={sites}
            date={dateKey}
            rangeLabel={formatDateLabelUTC(dateKey)}
          />
          <DateSwitcher value={dateKey} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex gap-2">
              <ClipboardPlusIcon />
              <CardTitle className="text-base">Reportes Parciales</CardTitle>
            </div>
            <CardDescription>Sumatoria de los reportes del día</CardDescription>
          </CardHeader>
          <CardContent>
            <DraftList drafts={partialRows} date={dateKey} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardClockIcon />
              Reporte Enviado
            </CardTitle>
            <CardDescription>
              Reporte pendiente de revisión y aprobación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SentReports reports={sentRows} date={dateKey} showHeader={false} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheckIcon />
              Reportes Aceptados
            </CardTitle>
            <CardDescription>
              Reportes aprobados por el manager.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AcceptedHistory
              groups={acceptedGroups}
              showName={isGlobal}
              range={range}
              from={from}
              to={to}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <XCircleIcon />
              Reportes Rechazados
            </CardTitle>
            <CardDescription>
              Rechazados por el manager. Hacé clic en Editar para corregirlos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RejectedReportDialog
              rows={rejectedRows}
              sites={sites}
              date={dateKey}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
