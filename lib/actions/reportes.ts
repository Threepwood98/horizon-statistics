"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import { toKey } from "@/lib/range";
import { type Shift } from "@/lib/shift";
import { getCurrentUser, getTurnoClosed } from "@/lib/session";
import { isGlobalRole } from "@/lib/roles";

type ActionResult = { error?: string; ok?: boolean };

function toDateKey(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

async function requireAuthedUser() {
  const { user } = await getCurrentUser();
  return { userId: user.id, user };
}

function isShift(value: unknown): value is Shift {
  return value === "AM" || value === "PM";
}

export async function addReport(input: {
  date: string;
  shift: Shift;
  websiteId: number;
  amount: number;
}): Promise<ActionResult> {
  const { userId, user } = await requireAuthedUser();

  const date = toDateKey(input.date);
  const amount = Number(input.amount);
  const websiteId = Number(input.websiteId);
  const shift = input.shift;

  if (!input.date) return { error: "Indicá la fecha" };
  if (!isShift(shift)) return { error: "Turno inválido" };
  if (Number.isNaN(amount) || amount < 0) return { error: "Monto inválido" };

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (date.getTime() > today.getTime())
    return { error: "No podés cargar fechas futuras" };

  const website = await prisma.website.findUnique({ where: { id: websiteId } });
  if (!website) return { error: "Sitio no encontrado" };

  if (await getTurnoClosed(userId, toKey(date), shift))
    return { error: "Este turno está cerrado. No podés agregar reportes." };

  const teamScope =
    user.teamId != null
      ? { user: { is: { teamId: user.teamId } } }
      : { userId };

  // Pendientes de días anteriores bloquean el sitio hasta aceptar el parte.
  const priorPending = await prisma.dailyReport.findFirst({
    where: {
      websiteId,
      status: { in: ["draft", "sent"] },
      date: { lt: date },
      ...teamScope,
    },
  });
  if (priorPending)
    return {
      error:
        "El sitio tiene partes sin aceptar de días anteriores. Esperá la actualización del monto.",
    };

  // Mi propio parte enviado de este sitio+turno → no puedo cargar otro.
  const ownSent = await prisma.dailyReport.findFirst({
    where: { userId, websiteId, date, shift, status: "sent" },
  });
  if (ownSent)
    return {
      error:
        "Ya enviaste este sitio para este turno. Esperá la respuesta del manager.",
    };

  // Un solo parte pendiente por (sitio, turno, equipo): bloqueo a pendientes de otros.
  const otherPending = await prisma.dailyReport.findFirst({
    where: {
      websiteId,
      date,
      shift,
      status: { in: ["draft", "sent"] },
      userId: { not: userId },
      ...teamScope,
    },
  });
  if (otherPending)
    return {
      error:
        "Tu equipo ya tiene un parte pendiente de este sitio en este turno. Esperá la respuesta del manager.",
    };

  // Mi borrador propio: acumulo el monto.
  const ownDraft = await prisma.dailyReport.findFirst({
    where: { userId, websiteId, date, shift, status: "draft" },
  });
  if (ownDraft) {
    await prisma.dailyReport.update({
      where: { id: ownDraft.id },
      data: { amount: ownDraft.amount.add(amount) },
    });
  } else {
    await prisma.dailyReport.create({
      data: { userId, websiteId, date, shift, amount, status: "draft" },
    });
  }

  revalidatePath("/reportes");
  return { ok: true };
}

export async function deleteDraft(id: number): Promise<ActionResult> {
  const { userId } = await requireAuthedUser();
  const report = await prisma.dailyReport.findUnique({ where: { id } });
  if (!report || report.userId !== userId || report.status !== "draft")
    return { error: "No podés eliminar ese reporte" };
  if (await getTurnoClosed(userId, toKey(report.date), report.shift))
    return { error: "Este turno está cerrado. No podés eliminar reportes." };
  await prisma.dailyReport.delete({ where: { id } });
  revalidatePath("/reportes");
  return { ok: true };
}

export async function updateReport(
  reportId: number,
  input: { websiteId: number; amount: number },
): Promise<ActionResult> {
  const { userId } = await requireAuthedUser();

  const amount = Number(input.amount);
  const websiteId = Number(input.websiteId);

  if (Number.isNaN(amount) || amount < 0) return { error: "Monto inválido" };

  const report = await prisma.dailyReport.findUnique({ where: { id: reportId } });
  if (!report || report.status !== "draft" || report.userId !== userId)
    return { error: "No podés editar ese reporte" };
  if (await getTurnoClosed(userId, toKey(report.date), report.shift))
    return { error: "Este turno está cerrado. No podés editar el reporte." };

  if (report.websiteId != null && Number(report.websiteId) !== websiteId) {
    const collision = await prisma.dailyReport.findFirst({
      where: {
        userId,
        websiteId,
        date: report.date,
        shift: report.shift,
        status: { in: ["draft", "sent", "accepted"] },
        NOT: { id: report.id },
      },
    });
    if (collision) return { error: "Ya tenés un reporte para ese sitio ese turno" };
  }

  await prisma.dailyReport.update({
    where: { id: report.id },
    data: { websiteId, amount },
  });

  revalidatePath("/reportes");
  return { ok: true };
}

export async function sendPart(
  date: string,
  shift: Shift,
): Promise<ActionResult> {
  const { userId, user } = await requireAuthedUser();

  if (user.teamId === null)
    return { error: "No pertenecés a un equipo, no podés enviar el parte" };

  if (await getTurnoClosed(userId, toKey(toDateKey(date)), shift))
    return { error: "Este turno está cerrado. No podés enviar el parte." };

  const reports = await prisma.dailyReport.findMany({
    where: { userId, date: toDateKey(date), shift, status: "draft" },
  });
  if (reports.length === 0)
    return { error: "No hay borradores para enviar en este turno" };

  await prisma.dailyReport.updateMany({
    where: { userId, date: toDateKey(date), shift, status: "draft" },
    data: { status: "sent", sentAt: new Date() },
  });

  revalidatePath("/reportes");
  return { ok: true };
}

export async function closeShift(
  date: string,
  shift: Shift,
): Promise<ActionResult> {
  const { userId } = await requireAuthedUser();

  const drafts = await prisma.dailyReport.count({
    where: { userId, date: toDateKey(date), shift, status: "draft" },
  });
  if (drafts > 0)
    return {
      error:
        "Tenés borradores sin enviar en este turno. Envialos antes de cerrar.",
    };

  await prisma.turnoClose.upsert({
    where: { userId_date_shift: { userId, date: toDateKey(date), shift } },
    create: { userId, date: toDateKey(date), shift },
    update: {},
  });

  revalidatePath("/reportes");
  revalidatePath("/");
  return { ok: true };
}

export async function resendRectified(
  date: string,
  shift: Shift,
  markedRowIds: number[],
): Promise<ActionResult> {
  const { userId } = await requireAuthedUser();

  const rejected = await prisma.dailyReport.findMany({
    where: {
      userId,
      date: toDateKey(date),
      shift,
      status: "draft",
      rejectionNote: { not: null },
    },
  });
  if (rejected.length === 0)
    return { error: "No hay reportes rechazados para ese turno" };

  const markedSet = new Set(markedRowIds.map(Number));
  for (const r of rejected) {
    if (!markedSet.has(Number(r.id))) continue;
    const originalAmount = r.originalAmount != null ? Number(r.originalAmount) : null;
    const originalWebsiteId =
      r.originalWebsiteId != null ? Number(r.originalWebsiteId) : null;
    const unchanged =
      originalAmount !== null &&
      Number(r.amount) === originalAmount &&
      (originalWebsiteId === null ||
        r.websiteId == null ||
        Number(r.websiteId) === originalWebsiteId);
    if (unchanged)
      return {
        error: "Corregí las filas marcadas antes de reenviar el reporte",
      };
  }

  await prisma.dailyReport.updateMany({
    where: { id: { in: rejected.map((r) => r.id) } },
    data: { status: "sent", sentAt: new Date(), rectified: true, rejectionNote: null, marked: false },
  });

  revalidatePath("/reportes");
  revalidatePath("/aprobaciones");
  return { ok: true };
}

async function canManageReport(user: { id: string; role: string }): Promise<boolean> {
  return isGlobalRole(user.role);
}

export async function approvePart(reportIds: number[]): Promise<ActionResult> {
  const { user } = await requireAuthedUser();
  if (!(await canManageReport(user)))
    return { error: "No tenés permisos para aprobar esos partes" };

  const ids = reportIds.map(Number).filter((n) => Number.isInteger(n));
  if (ids.length === 0) return { error: "No hay partes para aprobar" };

  const reports = await prisma.dailyReport.findMany({
    where: { id: { in: ids }, status: "sent" },
    include: { user: { select: { teamId: true } } },
  });
  if (reports.length === 0)
    return { error: "Los partes seleccionados no están pendientes de aprobación" };

  const gains = new Map<
    string,
    { teamId: bigint; websiteId: bigint; gain: number }
  >();
  const ops: Prisma.PrismaPromise<unknown>[] = [];

  for (const report of reports) {
    const gain = Math.round(Number(report.amount) * 100) / 100;
    ops.push(
      prisma.dailyReport.update({
        where: { id: report.id },
        data: { status: "accepted", acceptedAt: new Date(), rejectionNote: null },
      }),
    );

    const teamId = report.user?.teamId;
    if (teamId != null && report.websiteId != null) {
      const key = `${teamId}:${report.websiteId}`;
      const previous = gains.get(key);
      if (previous) previous.gain += gain;
      else gains.set(key, { teamId, websiteId: report.websiteId, gain });
    }
  }

  for (const { teamId, websiteId, gain } of gains.values()) {
    ops.push(
      prisma.balance.upsert({
        where: { teamId_websiteId: { teamId, websiteId } },
        create: { teamId, websiteId, balance: gain },
        update: { balance: { increment: gain } },
      }),
    );
  }

  await prisma.$transaction(ops);

  revalidatePath("/reportes");
  revalidatePath("/aprobaciones");
  revalidatePath("/");
  return { ok: true };
}

export async function rejectReport(
  reportId: number,
  note: string,
  markedRowIds?: number[],
): Promise<ActionResult> {
  const { user } = await requireAuthedUser();

  const noteText = (note || "").trim();
  if (!noteText) return { error: "Indicá el motivo del rechazo" };

  const report = await prisma.dailyReport.findUnique({
    where: { id: reportId },
  });
  if (!report || report.status !== "sent")
    return { error: "Ese parte no está pendiente de aprobación" };
  if (!(await canManageReport(user)))
    return { error: "No tenés permisos para rechazar ese parte" };

  const markedSet = new Set((markedRowIds ?? []).map(Number));
  const dayReports = await prisma.dailyReport.findMany({
    where: {
      userId: report.userId,
      date: report.date,
      shift: report.shift,
      status: "sent",
    },
  });
  if (dayReports.length === 0)
    return { error: "Ese parte no está pendiente de aprobación" };

  await prisma.$transaction([
    ...dayReports.map((r) =>
      prisma.dailyReport.update({
        where: { id: r.id },
        data: {
          status: "draft",
          sentAt: null,
          acceptedAt: null,
          rejectionNote: noteText,
          marked: markedSet.has(Number(r.id)),
          originalAmount: r.amount,
          originalWebsiteId: r.websiteId,
          rectified: false,
          resentAt: null,
        },
      }),
    ),
    // Reabre el turno para que el trabajador pueda rectificar.
    prisma.turnoClose.deleteMany({
      where: {
        userId: report.userId!,
        date: report.date,
        shift: report.shift,
      },
    }),
  ]);

  revalidatePath("/reportes");
  revalidatePath("/aprobaciones");
  return { ok: true };
}