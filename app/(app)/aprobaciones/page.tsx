import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeftIcon, InboxIcon } from "lucide-react";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { toKey } from "@/lib/range";
import { ApprovalList } from "@/components/reportes/approval-list";

export default async function AprobacionesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { team: true },
  });
  if (!user) redirect("/login");

  const role = user.role;
  if (role === "user") redirect("/");

  const isGlobal = role === "manager" || role === "admin";
  const canManage = isGlobal;

  const reports = await prisma.dailyReport.findMany({
    where: { status: "sent" },
    include: { user: { include: { team: true } }, website: true },
    orderBy: [{ date: "desc" }, { userId: "asc" }],
  });

  const visible = isGlobal
    ? reports
    : reports.filter((r) => r.user?.teamId === user.teamId);

  const groups = new Map<string, (typeof visible)[number][]>();
  for (const r of visible) {
    const key = `${r.userId}:${toKey(r.date)}`;
    const list = groups.get(key) || [];
    list.push(r);
    groups.set(key, list);
  }

  const groupList = Array.from(groups.entries())
    .map(([key, items]) => {
      const rows = items.map((r) => ({
        site: r.website?.name ?? "Sin sitio",
        originalSite:
          r.originalWebsiteId != null
            ? items.find((x) => Number(x.websiteId) === Number(r.originalWebsiteId))
                ?.website?.name ??
              String(r.originalWebsiteId)
            : null,
        amount: Number(r.amount),
        originalAmount:
          r.originalAmount != null ? Number(r.originalAmount) : null,
        rectified: r.rectified,
      } as { site: string; originalSite: string | null; amount: number; originalAmount: number | null; rectified: boolean }));
      return {
        id: items[0].id,
        reportIds: items.map((r) => Number(r.id)),
        userName: items[0].user?.name ?? "Desconocido",
        teamName: items[0].user?.team?.name ?? "Sin equipo",
        dateKey: toKey(items[0].date),
        rectified: items.some((r) => r.rectified),
        rows,
      };
    })
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .sort((a, b) => (a.userName < b.userName ? -1 : 1));

  const teamGroups = Array.from(
    groupList.reduce((map, g) => {
      const subtotal = g.rows.reduce((s, r) => s + r.amount, 0);
      const existing = map.get(g.teamName);
      const entry = {
        id: Number(g.id),
        reportIds: g.reportIds,
        userName: g.userName,
        dateKey: g.dateKey,
        rectified: g.rectified,
        rows: g.rows,
      };
      if (existing) {
        existing.subtotal += subtotal;
        existing.groups.push(entry);
      } else {
        map.set(g.teamName, {
          id: g.teamName,
          teamName: g.teamName,
          subtotal,
          groups: [entry],
        });
      }
      return map;
    }, new Map<string, { id: string; teamName: string; subtotal: number; groups: { id: number; reportIds: number[]; userName: string; dateKey: string; rectified: boolean; rows: { site: string; originalSite: string | null; amount: number; originalAmount: number | null; rectified: boolean }[] }[] }>()),
    ([, t]) => t,
  ).sort((a, b) => a.teamName.localeCompare(b.teamName));

  return (
    <div className="flex min-h-svh flex-col bg-background p-6 md:p-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon />
        Dashboard
      </Link>

      <div className="mt-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <InboxIcon />
          Aprobaciones
        </h1>
        <p className="text-muted-foreground">
          Partes enviados por tu equipo{" "}
          {user.team ? `· ${user.team.name}` : isGlobal ? "· todos los equipos" : ""}
          {!canManage && role === "leader" && " · solo lectura"}
        </p>
      </div>

      <div className="mt-6 max-w-3xl">
        <ApprovalList teams={teamGroups} canManage={canManage} />
      </div>
    </div>
  );
}
