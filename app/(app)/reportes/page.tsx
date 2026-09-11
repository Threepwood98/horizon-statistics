import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ClipboardCheckIcon,
  ClipboardClockIcon,
  ClipboardListIcon,
  ClipboardPlusIcon,
  ClipboardXIcon,
  PencilIcon,
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
  type Shift,
  shiftFromDate,
  shiftLabel,
} from "@/lib/shift";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReportDialog } from "@/components/reportes/report-dialog";
import { DraftList } from "@/components/reportes/draft-list";
import { SentReports } from "@/components/reportes/sent-reports";
import { RejectedReportDialog } from "@/components/reportes/rejected-report-dialog";
import { AcceptedHistory } from "@/components/reportes/accepted-history";
import { type SiteOption } from "@/components/reportes/report-form";
import { Badge } from "@/components/ui/badge";

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
    rejRange?: string;
    rejFrom?: string;
    rejTo?: string;
  }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const sp = await searchParams;
  const now = new Date();
  const dateKey = localDateKey(now);
  const dateStart = utcStart(dateKey);
  const { range, where, from, to } = {
    ...getRange(sp, now),
    from: sp.from,
    to: sp.to,
  };
  const rejectedRange = getRange(sp, now, "rej");

  const shift: Shift = shiftFromDate(now);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { team: true },
  });
  if (!user) redirect("/login");

  const role = user.role;
  const isGlobal = role === "manager" || role === "admin";
  const teamScope =
    user.teamId != null
      ? { user: { is: { teamId: user.teamId } } }
      : { userId: user.id };

  const websites = await prisma.website.findMany({ orderBy: { name: "asc" } });
  const websiteIds = websites.map((w) => w.id);

  const [balances, drafts, sentList, acceptedHistory, turnoClose,
    priorPendingRows, shiftPendingRows, prevShiftPendingRows] =
    await Promise.all([
      user.teamId != null
        ? prisma.balance.findMany({
            where: { teamId: user.teamId },
            select: { websiteId: true, balance: true },
          })
        : Promise.resolve([]),
      prisma.dailyReport.findMany({
        where: {
          userId: user.id,
          date: dateStart,
          shift,
          status: "draft",
        },
        include: { website: true },
        orderBy: { id: "asc" },
      }),
      prisma.dailyReport.findMany({
        where: {
          userId: user.id,
          date: dateStart,
          shift,
          status: "sent",
        },
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
      prisma.turnoClose.findUnique({
        where: { userId_date_shift: { userId: user.id, date: dateStart, shift } },
      }),
      prisma.dailyReport.findMany({
        where: {
          websiteId: { in: websiteIds },
          date: { lt: dateStart },
          status: { in: ["draft", "sent"] },
          ...teamScope,
        },
        select: { websiteId: true },
      }),
      prisma.dailyReport.findMany({
        where: {
          websiteId: { in: websiteIds },
          date: dateStart,
          shift,
          status: { in: ["draft", "sent"] },
          ...teamScope,
        },
        select: { websiteId: true, userId: true, status: true },
      }),
      shift === "TARDE"
        ? prisma.dailyReport.findMany({
            where: {
              websiteId: { in: websiteIds },
              date: dateStart,
              shift: "MANANA",
              status: { in: ["draft", "sent"] },
              ...teamScope,
            },
            select: { websiteId: true },
          })
        : Promise.resolve([]),
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

  const priorPendingSites = new Set<bigint>();
  for (const r of priorPendingRows) if (r.websiteId != null) priorPendingSites.add(r.websiteId);
  const prevShiftPendingSites = new Set<bigint>();
  for (const r of prevShiftPendingRows)
    if (r.websiteId != null) prevShiftPendingSites.add(r.websiteId);
  const ownDraftSites = new Set<bigint>();
  for (const r of drafts) if (r.websiteId != null) ownDraftSites.add(r.websiteId);
  const blockedShiftSites = new Set<bigint>();
  for (const r of shiftPendingRows) {
    if (r.websiteId == null) continue;
    const mine = r.userId === user.id;
    if (!mine && r.status === "draft") blockedShiftSites.add(r.websiteId);
    if (r.status === "sent") blockedShiftSites.add(r.websiteId);
  }

  const sites: SiteOption[] = websites.map((w) => {
    const approved = balanceBySite.get(w.id) ?? 0;
    const partial = temporalesBySite.get(w.id) ?? 0;
    const balanceInicio = Math.round((approved + partial) * 100) / 100;
    if (priorPendingSites.has(w.id))
      return {
        id: Number(w.id),
        name: w.name,
        balanceInicio,
        blocked: true,
        warning:
          "Tiene partes sin aceptar de días anteriores. Esperá la actualización del monto.",
      };
    if (blockedShiftSites.has(w.id))
      return {
        id: Number(w.id),
        name: w.name,
        balanceInicio,
        blocked: true,
        warning:
          "El sitio ya tiene un parte pendiente en este turno por tu equipo.",
      };
    if (ownDraftSites.has(w.id))
      return {
        id: Number(w.id),
        name: w.name,
        balanceInicio,
        note: "Ya tenés un borrador para este sitio en este turno: los montos se suman.",
      };
    if (prevShiftPendingSites.has(w.id))
      return {
        id: Number(w.id),
        name: w.name,
        balanceInicio,
        note: "El parte de la mañana de este sitio está pendiente. El monto de inicio puede no estar actualizado.",
      };
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

  const sentRows = sentList.map((r) => ({
    site: r.website?.name ?? "Sin sitio",
    amount: Number(r.amount),
  }));

  const rejectedHistory = await prisma.dailyReport.findMany({
    where: {
      ...(isGlobal ? {} : { userId: user.id }),
      date: rejectedRange.where,
      status: "draft",
      rejectionNote: { not: null },
    },
    include: { website: true, user: { include: { team: true } } },
    orderBy: [{ date: "desc" }, { id: "asc" }],
  });

  type RejectedGroup = {
    id: string;
    userName: string;
    teamName: string;
    dateKey: string;
    shift: Shift;
    totalAmount: number;
    rows: {
      id: number;
      websiteId: number;
      site: string;
      amount: number;
      rejectionNote: string | null;
      marked: boolean;
      originalAmount: number | null;
      originalSite: string | null;
    }[];
  };

  const rejectedGroups = Array.from(
    rejectedHistory.reduce((map, r) => {
      const key = `${r.userId}:${toKey(r.date)}:${r.shift}`;
      const existing = map.get(key);
      const row = {
        id: Number(r.id),
        websiteId: r.websiteId != null ? Number(r.websiteId) : 0,
        site: r.website?.name ?? "Sin sitio",
        amount: Number(r.amount),
        rejectionNote: r.rejectionNote,
        marked: r.marked,
        originalAmount:
          r.originalAmount != null ? Number(r.originalAmount) : null,
        originalSite:
          r.originalWebsiteId != null
            ? (websites.find((w) => w.id === r.originalWebsiteId)?.name ?? null)
            : null,
      };
      if (existing) {
        existing.totalAmount += row.amount;
        existing.rows.push(row);
      } else {
        map.set(key, {
          id: key,
          userName:
            r.user?.displayUsername || r.user?.name || "Usuario",
          teamName: r.user?.team?.name ?? "Sin equipo",
          dateKey: toKey(r.date),
          shift: r.shift,
          totalAmount: row.amount,
          rows: [row],
        });
      }
      return map;
    }, new Map<string, RejectedGroup>()),
    ([, g]) => g,
  ).sort(
    (a, b) =>
      a.dateKey < b.dateKey
        ? 1
        : a.dateKey > b.dateKey
          ? -1
          : a.shift === b.shift
            ? 0
            : a.shift < b.shift
              ? -1
              : 1,
  );

  type AcceptedGroup = {
    id: string;
    userName: string;
    teamName: string;
    dateKey: string;
    shift: Shift;
    totalAmount: number;
    sites: { site: string; amount: number }[];
  };

  const acceptedGroups = Array.from(
    acceptedHistory.reduce((map, r) => {
      const currentUser = r.user;
      const key = `${r.userId}:${toKey(r.date)}:${r.shift}`;
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
          shift: r.shift,
          totalAmount: entry.amount,
          sites: [entry],
        });
      }
      return map;
    }, new Map<string, AcceptedGroup>()),
    ([, a]) => a,
  ).sort(
    (a, b) =>
      a.dateKey < b.dateKey
        ? 1
        : a.dateKey > b.dateKey
          ? -1
          : a.shift === b.shift
            ? 0
            : a.shift < b.shift
              ? -1
              : 1,
  );

  return (
    <div className="flex flex-col">
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ClipboardListIcon />
            Mis reportes
          </h1>
          <p className="text-sm text-muted-foreground">
            Turno {shiftLabel(shift)} · {formatDateLabelUTC(dateKey)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ReportDialog
            sites={sites}
            date={dateKey}
            shift={shift}
            rangeLabel={formatDateLabelUTC(dateKey)}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex gap-2">
              <ClipboardPlusIcon />
              <CardTitle className="text-base">Reportes Parciales</CardTitle>
            </div>
            <CardDescription>
              Sumatoria de los reportes del turno {shiftLabel(shift)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DraftList
              drafts={partialRows}
              date={dateKey}
              shift={shift}
              closed={Boolean(turnoClose)}
              sites={sites}
            />
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
            <CardTitle className="flex gap-2 text-base">
              <ClipboardXIcon />
              Reporte Rechazado
            </CardTitle>
            <CardDescription>
              Rechazado por el manager. Haz click en{" "}
              <Badge variant="secondary" className="text-sm">
                <PencilIcon /> editar
              </Badge>
              {" "}para corregirlos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RejectedReportDialog
              groups={rejectedGroups}
              sites={sites}
              showName={isGlobal}
              range={rejectedRange.range}
              from={sp.rejFrom}
              to={sp.rejTo}
              prefix="rej"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}