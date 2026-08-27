import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { StatCard } from "@/components/dashboard/stat-card";
import { DailyChart } from "@/components/dashboard/daily-chart";
import { SiteBreakdown } from "@/components/dashboard/site-breakdown";
import { RecentHistory } from "@/components/dashboard/recent-history";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TrendingUpIcon,
  TrophyIcon,
  FlameIcon,
  CalendarCheckIcon,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [reports, userCount] = await Promise.all([
    prisma.dailyReport.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      include: { website: true, worker: true },
      orderBy: { date: "desc" },
    }),
    prisma.user.count(),
  ]);

  // Daily aggregation (last 30 days)
  const dailyMap = new Map<string, number>();
  for (const r of reports) {
    const key = r.date.toISOString().split("T")[0];
    const gain = Number(r.endAmount) - Number(r.startAmount);
    dailyMap.set(key, (dailyMap.get(key) || 0) + gain);
  }
  const dailyData = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, total]) => ({
      day: new Date(day + "T00:00:00").toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
      }),
      total: Math.round(total * 100) / 100,
    }));

  // Stats
  const totalMonth = dailyData.reduce((s, d) => s + d.total, 0);
  const avgMonth = dailyData.length > 0 ? totalMonth / dailyData.length : 0;
  const bestDay = dailyData.reduce(
    (a, b) => (b.total > a.total ? b : a),
    dailyData[0] || { day: "-", total: 0 },
  );

  // Today
  const todayStr = now.toISOString().split("T")[0];
  const todayReports = reports.filter(
    (r) => r.date.toISOString().split("T")[0] === todayStr,
  );
  const todayTotal = todayReports.reduce(
    (s, r) => s + (Number(r.endAmount) - Number(r.startAmount)),
    0,
  );

  // Streak
  let streak = 0;
  const daySet = new Set(dailyData.map((d) => d.day));
  const today = new Date(now);
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0].slice(5);
    if (daySet.has(key)) streak++;
    else break;
  }

  // By site
  const siteMap = new Map<string, number>();
  for (const r of reports) {
    const name = r.website?.name || "Sin sitio";
    const gain = Number(r.endAmount) - Number(r.startAmount);
    siteMap.set(name, (siteMap.get(name) || 0) + gain);
  }
  const bySite = Array.from(siteMap.entries())
    .map(([name, total]) => ({ name, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);

  // Recent history (last 10)
  const recent = reports.slice(0, 10).map((r) => ({
    date: r.date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    }),
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
          icon={TrendingUpIcon}
          label="Ganancia mensual"
          value={`$ ${totalMonth.toFixed(2)}`}
          sub={`Promedio $ ${avgMonth.toFixed(2)}/día`}
        />
        <StatCard
          icon={TrophyIcon}
          label="Mejor día"
          value={`$ ${bestDay.total.toFixed(2)}`}
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
          value={`$ ${todayTotal.toFixed(2)}`}
          sub={`${todayReports.length} reportes enviados`}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            Ganancia diaria · últimos 30 días
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DailyChart data={dailyData} />
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ganancia por sitio</CardTitle>
          </CardHeader>
          <CardContent>
            <SiteBreakdown data={bySite} />
          </CardContent>
        </Card>

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
