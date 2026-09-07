import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getRange, toKey, addDaysKey, formatDateLabelUTC, localDateKey } from "@/lib/range";
import type { Prisma } from "@/app/generated/prisma/client";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isShiftParam, shiftFromParam } from "@/lib/shift";
import { StatCard } from "@/components/dashboard/stat-card";
import { DailyChart } from "@/components/dashboard/daily-chart";
import { SiteBreakdown } from "@/components/dashboard/site-breakdown";
import { RecentHistory } from "@/components/dashboard/recent-history";
import { Balance } from "@/components/dashboard/balance";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { RangeSelector } from "@/components/dashboard/range-selector";
import { ScopeFilters } from "@/components/dashboard/scope-filters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSignIcon,
  TrophyIcon,
  FlameIcon,
  CalendarCheckIcon,
} from "lucide-react";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
    equipo?: string;
    usuario?: string;
    turno?: string;
  }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const sp = await searchParams;
  const now = new Date();
  const { range, where, rangeLabel } = getRange(sp, now);
  const todayKey = localDateKey(now);
  const todayStart = new Date(`${todayKey}T00:00:00Z`);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { team: true },
  });
  if (!user) redirect("/login");

  const role = user.role;
  const isWorker = role === "user";
  const isLeader = role === "leader";
  const isGlobal = role === "manager" || role === "admin";

  const shiftFilter = isShiftParam(sp.turno) ? shiftFromParam(sp.turno) : null;

  const dataScope: Prisma.DailyReportWhereInput = {};
  if (isWorker) {
    dataScope.userId = user.id;
  } else if (isLeader) {
    if (user.teamId != null) dataScope.user = { is: { teamId: user.teamId } };
  } else {
    if (sp.usuario) dataScope.userId = sp.usuario;
    else if (sp.equipo && /^\d+$/.test(sp.equipo))
      dataScope.user = { is: { teamId: BigInt(sp.equipo) } };
  }
  if (shiftFilter) dataScope.shift = shiftFilter;

  const balanceTeamId: bigint | null =
    isWorker || isLeader
      ? user.teamId
      : sp.equipo && /^\d+$/.test(sp.equipo)
        ? BigInt(sp.equipo)
        : null;

  const liveScope: Prisma.DailyReportWhereInput | null =
    balanceTeamId != null
      ? {
          user: { is: { teamId: balanceTeamId } },
          ...(shiftFilter ? { shift: shiftFilter } : {}),
        }
      : null;

  const [
    teams,
    users,
    rangeReports,
    statsHistory,
    todayReports,
    recentReports,
    balances,
    todayLiveReports,
  ] = await Promise.all([
    isGlobal
      ? prisma.team.findMany({ orderBy: { name: "asc" } })
      : Promise.resolve([] as Awaited<ReturnType<typeof prisma.team.findMany>>),
    isGlobal
      ? prisma.user.findMany({
          orderBy: { name: "asc" },
          include: { team: { select: { name: true } } },
        })
      : Promise.resolve([]),
    prisma.dailyReport.findMany({
      where: { date: where, status: "accepted", ...dataScope },
      include: { website: true, user: true },
      orderBy: { date: "desc" },
    }),
    prisma.dailyReport.groupBy({
      by: ["date"],
      where: { status: "accepted", ...dataScope },
      _sum: { amount: true },
    }),
    prisma.dailyReport.findMany({
      where: { date: todayStart, status: "accepted", ...dataScope },
    }),
    prisma.dailyReport.findMany({
      where: { status: "accepted", ...dataScope },
      include: { website: true, user: true },
      orderBy: { date: "desc" },
      take: 10,
    }),
    balanceTeamId != null
      ? prisma.balance.findMany({
          where: { teamId: balanceTeamId },
          include: { website: true },
          orderBy: { balance: "desc" },
        })
      : Promise.resolve([]),
    liveScope != null
      ? prisma.dailyReport.findMany({
          where: {
            date: todayStart,
            status: { in: ["draft", "sent"] },
            ...liveScope,
          },
          include: { website: true, user: true },
        })
      : Promise.resolve([]),
  ]);

  // Daily aggregation (selected range)
  const dailyMap = new Map<string, number>();
  for (const r of rangeReports) {
    const key = toKey(r.date);
    const gain = Number(r.amount);
    dailyMap.set(key, (dailyMap.get(key) || 0) + gain);
  }
  const dailyData = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, total]) => ({
      day: formatDateLabelUTC(day),
      total: Math.round(total * 100) / 100,
    }));

  // Stats (independent of selected range)
  const monthDays = statsHistory.filter(
    (d) =>
      d.date.getUTCMonth() === now.getUTCMonth() &&
      d.date.getUTCFullYear() === now.getUTCFullYear(),
  );
  const totalMonth = monthDays.reduce(
    (s, d) => s + Number(d._sum.amount),
    0,
  );
  const avgMonth = monthDays.length > 0 ? totalMonth / monthDays.length : 0;
  const bestDay = statsHistory.reduce(
    (best, d) => {
      const gain = Number(d._sum.amount);
      if (gain > best.total) {
        return {
          day: formatDateLabelUTC(toKey(d.date)),
          total: Math.round(gain * 100) / 100,
        };
      }
      return best;
    },
    { day: "-", total: 0 },
  );

  // Today
  const todayTotal = todayReports.reduce(
    (s, r) => s + Number(r.amount),
    0,
  );

  // Streak (all-time, consecutive days ending today)
  const dateSet = new Set(statsHistory.map((d) => toKey(d.date)));
  let streak = 0;
  for (let i = 0; i < 3650; i++) {
    const key = addDaysKey(todayKey, -i);
    if (dateSet.has(key)) streak++;
    else break;
  }

  // By site (selected range)
  const siteMap = new Map<string, number>();
  for (const r of rangeReports) {
    const name = r.website?.name || "Sin sitio";
    const gain = Number(r.amount);
    siteMap.set(name, (siteMap.get(name) || 0) + gain);
  }
  const bySite = Array.from(siteMap.entries())
    .map(([name, total]) => ({ name, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);

  // Recent history (last 10, independent of range)
  const recent = recentReports.map((r) => ({
    date: formatDateLabelUTC(toKey(r.date)),
    site: r.website?.name || "-",
    worker: r.user?.name || "-",
    amount: Number(r.amount),
  }));

  const teamId = balanceTeamId;

  const liveGainBySite = new Map<string, number>();
  for (const r of todayLiveReports) {
    const name = r.website?.name || "Sin sitio";
    const gain = Number(r.amount);
    liveGainBySite.set(name, (liveGainBySite.get(name) || 0) + gain);
  }

  const balanceRows = balances.map((a) => {
    const site = a.website?.name || "Sin sitio";
    const historic = Number(a.balance);
    const live =
      Math.round((historic + (liveGainBySite.get(site) || 0)) * 100) / 100;
    return { site, historic, live };
  });

  return (
    <>
      <DashboardHeader
        userName={user.name}
        teamName={user.team?.name ?? ""}
        role={role}
      />

      <div className="mt-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={DollarSignIcon}
          label="Ganancia mensual"
          value={`$${totalMonth.toFixed(2)}`}
          sub={`~ $${avgMonth.toFixed(2)}/día`}
        />
        <StatCard
          icon={TrophyIcon}
          label="Mejor día"
          value={`$${bestDay.total.toFixed(2)}`}
          sub={`${bestDay.day}`}
        />
        <StatCard
          icon={FlameIcon}
          label="Racha"
          value={`${streak} días`}
          sub="Reportando seguido"
        />
        <StatCard
          icon={CalendarCheckIcon}
          label="Hoy"
          value={`$${todayTotal.toFixed(2)}`}
          sub={`${todayReports.length} reportes enviados`}
        />
      </div>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <RangeSelector range={range} from={sp.from} to={sp.to} />
        {isGlobal && (
          <ScopeFilters
            teams={teams.map((t) => ({ id: String(t.id), name: t.name }))}
            users={users.map((u) => ({
              id: u.id,
              name: u.name ?? "Usuario",
              teamName: u.team?.name ?? null,
            }))}
            equipo={sp.equipo}
            usuario={sp.usuario}
            turno={
              isShiftParam(sp.turno) ? sp.turno : undefined
            }
          />
        )}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <DailyChart data={dailyData} rangeLabel={rangeLabel} />
        <SiteBreakdown data={bySite} rangeLabel={rangeLabel} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentHistory data={recent} />
          </CardContent>
        </Card>
      </div>

      {teamId != null && (
        <div className="mt-6">
          <Balance
            balances={balanceRows}
            teamName={user.team?.name ?? "Equipo seleccionado"}
            className="max-w-2xl"
          />
        </div>
      )}
    </>
  );
}