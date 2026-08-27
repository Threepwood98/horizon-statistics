import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getRange, toKey, addDaysKey, formatDateLabelUTC } from "@/lib/range";
import { StatCard } from "@/components/dashboard/stat-card";
import { DailyChart } from "@/components/dashboard/daily-chart";
import { SiteBreakdown } from "@/components/dashboard/site-breakdown";
import { RecentHistory } from "@/components/dashboard/recent-history";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { RangeSelector } from "@/components/dashboard/range-selector";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DollarSignIcon,
  TrophyIcon,
  FlameIcon,
  CalendarCheckIcon,
} from "lucide-react";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const sp = await searchParams;
  const now = new Date();
  const { range, where, rangeLabel } = getRange(sp, now);
  const todayKey = toKey(now);
  const todayStart = new Date(`${todayKey}T00:00:00Z`);

  const [rangeReports, statsHistory, todayReports, recentReports] =
    await Promise.all([
      prisma.dailyReport.findMany({
        where: { date: where },
        include: { website: true, worker: true },
        orderBy: { date: "desc" },
      }),
      prisma.dailyReport.groupBy({
        by: ["date"],
        _sum: { startAmount: true, endAmount: true },
      }),
      prisma.dailyReport.findMany({ where: { date: todayStart } }),
      prisma.dailyReport.findMany({
        include: { website: true, worker: true },
        orderBy: { date: "desc" },
        take: 10,
      }),
    ]);

  // Daily aggregation (selected range)
  const dailyMap = new Map<string, number>();
  for (const r of rangeReports) {
    const key = toKey(r.date);
    const gain = Number(r.endAmount) - Number(r.startAmount);
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
    (s, d) => s + (Number(d._sum.endAmount) - Number(d._sum.startAmount)),
    0,
  );
  const avgMonth = monthDays.length > 0 ? totalMonth / monthDays.length : 0;
  const bestDay = statsHistory.reduce(
    (best, d) => {
      const gain = Number(d._sum.endAmount) - Number(d._sum.startAmount);
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
    (s, r) => s + (Number(r.endAmount) - Number(r.startAmount)),
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
    const gain = Number(r.endAmount) - Number(r.startAmount);
    siteMap.set(name, (siteMap.get(name) || 0) + gain);
  }
  const bySite = Array.from(siteMap.entries())
    .map(([name, total]) => ({ name, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);

  // Recent history (last 10, independent of range)
  const recent = recentReports.map((r) => ({
    date: formatDateLabelUTC(toKey(r.date)),
    site: r.website?.name || "-",
    worker: r.worker?.name || "-",
    startAmount: Number(r.startAmount),
    endAmount: Number(r.endAmount),
  }));

  return (
    <div className="flex min-h-svh flex-col bg-background p-6 md:p-10">
      <DashboardHeader
        userName={session.user.displayUsername || session.user.name}
        teamName="Equipo Alpha"
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
          sub={`Día ${bestDay.day}`}
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

      <div className="mt-6">
        <RangeSelector range={range} from={sp.from} to={sp.to} />
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
    </div>
  );
}