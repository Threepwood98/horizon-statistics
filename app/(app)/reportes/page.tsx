import type { Metadata } from "next";
import {
  ClipboardClockIcon,
  ClipboardListIcon,
  ClipboardXIcon,
  PencilIcon,
} from "lucide-react";

import prisma from "@/lib/prisma";
import {
  utcStart,
  localDateKey,
  getRange,
} from "@/lib/range";
import { type Shift, shiftFromDate } from "@/lib/shift";
import { getTurnoClosed, getCurrentUser } from "@/lib/session";
import { isGlobalRole } from "@/lib/roles";
import { teamScopeFor } from "@/lib/team-scope";
import { buildRejectedGroups, buildSiteOptions } from "@/lib/reports";
import type { SiteOption } from "@/lib/reports-shapes";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReportDialog } from "@/components/reportes/report-dialog";
import { DraftList } from "@/components/reportes/draft-list";
import { SentReports } from "@/components/reportes/sent-reports";
import { RejectedReportDialog } from "@/components/reportes/rejected-report-dialog";
import { Badge } from "@/components/ui/badge";
import { RangeSelector } from "@/components/dashboard/range-selector";

export const metadata: Metadata = { title: "Mis reportes" };

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
  const { user } = await getCurrentUser();

  const sp = await searchParams;
  const now = new Date();
  const dateKey = localDateKey(now);
  const dateStart = utcStart(dateKey);
  const rejectedRange = getRange(sp, now, "rej");

  const shift: Shift = shiftFromDate(now);

  const role = user.role;
  const isGlobal = isGlobalRole(role);
  const teamScope = teamScopeFor(user);

  const websites = await prisma.website.findMany({ orderBy: { name: "asc" } });
  const websiteIds = websites.map((w) => w.id);
  const siteNameById = new Map(websites.map((w) => [w.id, w.name]));

  const [
    balances,
    drafts,
    sentList,
    priorPendingRows,
    shiftPendingRows,
    prevShiftPendingRows,
    rejectedHistory,
  ] = await Promise.all([
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
    shift === "PM"
      ? prisma.dailyReport.findMany({
          where: {
            websiteId: { in: websiteIds },
            date: dateStart,
            shift: "AM",
            status: { in: ["draft", "sent"] },
            ...teamScope,
          },
          select: { websiteId: true },
        })
      : Promise.resolve([]),
    prisma.dailyReport.findMany({
      where: {
        ...(isGlobal ? {} : { userId: user.id }),
        date: rejectedRange.where,
        status: "draft",
        rejectionNote: { not: null },
      },
      include: { website: true, user: { include: { team: true } } },
      orderBy: [{ date: "desc" }, { id: "asc" }],
    }),
  ]);

  const closed = await getTurnoClosed(user.id, dateKey, shift);

  const sites: SiteOption[] = buildSiteOptions({
    websites,
    balances,
    temporales: [...drafts, ...sentList],
    priorPending: priorPendingRows,
    prevShiftPending: prevShiftPendingRows,
    ownDrafts: drafts,
    shiftPending: shiftPendingRows,
    currentUserId: user.id,
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

  const rejectedGroups = buildRejectedGroups(rejectedHistory, siteNameById);

  return (
    <div className="flex flex-col gap-4">
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex gap-2">
              <ClipboardListIcon />
              <CardTitle className="text-base">Reporte</CardTitle>
            </div>
            <CardDescription>Sumatoria del reporte</CardDescription>
            <CardAction>
              <ReportDialog
                sites={sites}
                date={dateKey}
                shift={shift}
              />
            </CardAction>
          </CardHeader>
          <CardContent>
            <DraftList
              drafts={partialRows}
              date={dateKey}
              shift={shift}
              closed={closed}
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
      </div>
      <Card>
        <CardHeader className="grid gap-2 lg:grid-cols-2">
          <div>
            <CardTitle className="flex gap-2 text-base">
              <ClipboardXIcon />
              Reporte Rechazado
            </CardTitle>
            <CardDescription>
              Rechazado por el manager. Haz click en{" "}
              <Badge variant="secondary" className="text-sm">
                <PencilIcon /> editar
              </Badge>{" "}
              para corregirlos.
            </CardDescription>
          </div>
          <div className="flex lg:justify-end lg:items-start">
            <RangeSelector
              range={rejectedRange.range}
              from={sp.rejFrom}
              to={sp.rejTo}
              prefix="rej"
            />
          </div>
        </CardHeader>
        <CardContent>
          <RejectedReportDialog
            groups={rejectedGroups}
            sites={sites}
            showName={isGlobal}
          />
        </CardContent>
      </Card>
    </div>
  );
}