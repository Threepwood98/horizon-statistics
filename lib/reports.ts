import type { Prisma } from "@/app/generated/prisma/client";
import { toKey } from "@/lib/range";
import { type Shift } from "@/lib/shift";
import type {
  ApprovalGroup,
  RejectedGroup,
  SiteOption,
  TeamGroup,
} from "@/lib/reports-shapes";

export const SITE_WARNING_PRIOR =
  "Tiene partes sin aceptar de días anteriores. Esperá la actualización del monto.";
export const SITE_WARNING_SHIFT =
  "El sitio ya tiene un parte pendiente en este turno por tu equipo.";
export const SITE_NOTE_OWN_DRAFT =
  "Ya tenés un borrador para este sitio en este turno: los montos se suman.";
export const SITE_NOTE_PREV_SHIFT =
  "El parte de la mañana de este sitio está pendiente. El monto de inicio puede no estar actualizado.";

export type ReportWithUserAndSite = Prisma.DailyReportGetPayload<{
  include: { website: true; user: { include: { team: true } } };
}>;

type SiteRow = { websiteId: bigint | null };
type AmountRow = SiteRow & { amount: Prisma.Decimal };
type ShiftPendingRow = SiteRow & { userId: string | null; status: string };

interface BuildSiteOptionsArgs {
  websites: { id: bigint; name: string }[];
  balances: { websiteId: bigint; balance: Prisma.Decimal }[];
  temporales: AmountRow[];
  priorPending: SiteRow[];
  prevShiftPending: SiteRow[];
  ownDrafts: SiteRow[];
  shiftPending: ShiftPendingRow[];
  currentUserId: string;
}

export function buildSiteOptions(args: BuildSiteOptionsArgs): SiteOption[] {
  const balanceBySite = new Map<bigint, number>();
  for (const b of args.balances) {
    balanceBySite.set(b.websiteId, Number(b.balance));
  }

  const temporalesBySite = new Map<bigint, number>();
  for (const r of args.temporales) {
    if (r.websiteId == null) continue;
    temporalesBySite.set(
      r.websiteId,
      (temporalesBySite.get(r.websiteId) ?? 0) + Number(r.amount),
    );
  }

  const asSet = (rows: SiteRow[]) =>
    new Set(rows.filter((r) => r.websiteId != null).map((r) => r.websiteId));

  const priorPendingSites = asSet(args.priorPending);
  const prevShiftPendingSites = asSet(args.prevShiftPending);
  const ownDraftSites = asSet(args.ownDrafts);

  const blockedShiftSites = new Set<bigint>();
  for (const r of args.shiftPending) {
    if (r.websiteId == null) continue;
    const mine = r.userId === args.currentUserId;
    if (!mine && r.status === "draft") blockedShiftSites.add(r.websiteId);
    if (r.status === "sent") blockedShiftSites.add(r.websiteId);
  }

  return args.websites.map((w) => {
    const base = {
      id: Number(w.id),
      name: w.name,
      balanceInicio:
        Math.round(
          ((balanceBySite.get(w.id) ?? 0) +
            (temporalesBySite.get(w.id) ?? 0)) *
            100,
        ) / 100,
    };
    if (priorPendingSites.has(w.id))
      return { ...base, blocked: true, warning: SITE_WARNING_PRIOR };
    if (blockedShiftSites.has(w.id))
      return { ...base, blocked: true, warning: SITE_WARNING_SHIFT };
    if (ownDraftSites.has(w.id))
      return { ...base, note: SITE_NOTE_OWN_DRAFT };
    if (prevShiftPendingSites.has(w.id))
      return { ...base, note: SITE_NOTE_PREV_SHIFT };
    return base;
  });
}

function groupKey(userId: string, date: Date, shift: Shift): string {
  return `${userId}:${toKey(date)}:${shift}`;
}

export function buildRejectedGroups(
  rows: ReportWithUserAndSite[],
  siteNameById: Map<bigint, string>,
): RejectedGroup[] {
  const groups = new Map<string, RejectedGroup>();
  for (const r of rows) {
    const key = groupKey(r.userId ?? "", r.date, r.shift);
    const row = {
      id: Number(r.id),
      websiteId: r.websiteId != null ? Number(r.websiteId) : 0,
      site: r.website?.name ?? "Sin sitio",
      amount: Number(r.amount),
      rejectionNote: r.rejectionNote,
      marked: r.marked,
      originalAmount: r.originalAmount != null ? Number(r.originalAmount) : null,
      originalSite:
        r.originalWebsiteId != null
          ? siteNameById.get(r.originalWebsiteId) ?? null
          : null,
    };
    const existing = groups.get(key);
    if (existing) {
      existing.totalAmount += row.amount;
      existing.rows.push(row);
    } else {
      groups.set(key, {
        id: key,
        userName: r.user?.displayUsername || r.user?.name || "Usuario",
        teamName: r.user?.team?.name ?? "Sin equipo",
        dateKey: toKey(r.date),
        shift: r.shift,
        totalAmount: row.amount,
        rows: [row],
      });
    }
  }
  return Array.from(groups.values()).sort((a, b) =>
    a.dateKey === b.dateKey
      ? a.shift < b.shift
        ? -1
        : 1
      : a.dateKey > b.dateKey
        ? -1
        : 1,
  );
}

export function buildApprovalGroups(
  reports: ReportWithUserAndSite[],
  closedKeys: Set<string>,
): ApprovalGroup[] {
  const groups = new Map<string, ReportWithUserAndSite[]>();
  for (const r of reports) {
    const key = groupKey(r.userId ?? "", r.date, r.shift);
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }

  return Array.from(groups.values())
    .map((items): ApprovalGroup => {
      const rows = items.map((r) => ({
        site: r.website?.name ?? "Sin sitio",
        originalSite:
          r.originalWebsiteId != null
            ? items.find(
                (x) => Number(x.websiteId) === Number(r.originalWebsiteId),
              )?.website?.name ?? String(r.originalWebsiteId)
            : null,
        amount: Number(r.amount),
        originalAmount: r.originalAmount != null ? Number(r.originalAmount) : null,
        rectified: r.rectified,
      }));
      return {
        id: Number(items[0].id),
        reportIds: items.map((r) => Number(r.id)),
        userName: items[0].user?.name ?? "Desconocido",
        teamName: items[0].user?.team?.name ?? "Sin equipo",
        dateKey: toKey(items[0].date),
        shift: items[0].shift,
        closed: closedKeys.has(
          groupKey(items[0].userId ?? "", items[0].date, items[0].shift),
        ),
        rectified: items.some((r) => r.rectified),
        rows,
      };
    })
    .sort((a, b) => {
      if (a.userName !== b.userName) return a.userName < b.userName ? -1 : 1;
      return a.dateKey.localeCompare(b.dateKey);
    });
}

export function buildTeamGroups(groups: ApprovalGroup[]): TeamGroup[] {
  const byTeam = new Map<string, TeamGroup>();
  for (const g of groups) {
    const subtotal = g.rows.reduce((s, r) => s + r.amount, 0);
    const entry = {
      id: g.id,
      reportIds: g.reportIds,
      userName: g.userName,
      teamName: g.teamName,
      dateKey: g.dateKey,
      shift: g.shift,
      closed: g.closed,
      rectified: g.rectified,
      rows: g.rows,
    };
    const existing = byTeam.get(g.teamName);
    if (existing) {
      existing.subtotal += subtotal;
      existing.groups.push(entry);
    } else {
      byTeam.set(g.teamName, {
        id: g.teamName,
        teamName: g.teamName,
        subtotal,
        groups: [entry],
      });
    }
  }
  return Array.from(byTeam.values()).sort((a, b) =>
    a.teamName.localeCompare(b.teamName),
  );
}