"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { type Shift } from "@/lib/shift";

type ActionResult = { error?: string; ok?: boolean };

function toDateKey(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

async function requireAuthedUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) throw new Error("Usuario no encontrado");
  return { userId: session.user.id, user };
}

function isManagerOrAdmin(role: string): boolean {
  return role === "manager" || role === "admin";
}

function isShift(value: unknown): value is Shift {
  return value === "MANANA" || value === "TARDE";
}

async function isTurnoClosed(userId: string, date: Date, shift: Shift) {
  const closed = await prisma.turnoClose.findUnique({
    where: { userId_date_shift: { userId, date, shift } },
  });
  return Boolean(closed);
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

  if (await isTurnoClosed(userId, date, shift))
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
  if (await isTurnoClosed(userId, report.date, report.shift))
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
  if (await isTurnoClosed(userId, report.date, report.shift))
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

  if (await isTurnoClosed(userId, toDateKey(date), shift))
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
  return isManagerOrAdmin(user.role);
}

export async function acceptReport(reportId: number): Promise<ActionResult> {
  const { user } = await requireAuthedUser();

  const report = await prisma.dailyReport.findUnique({
    where: { id: reportId },
    include: { user: { select: { teamId: true } } },
  });
  if (!report || report.status !== "sent")
    return { error: "Ese parte no está pendiente de aprobación" };
  if (!(await canManageReport(user)))
    return { error: "No tenés permisos para aprobar ese parte" };

  const gain = Number(report.amount);
  const teamId = report.user?.teamId;
  const websiteId = report.websiteId;

  if (teamId != null && websiteId != null) {
    await prisma.$transaction([
      prisma.dailyReport.update({
        where: { id: report.id },
        data: { status: "accepted", acceptedAt: new Date(), rejectionNote: null },
      }),
      prisma.balance.upsert({
        where: { teamId_websiteId: { teamId, websiteId } },
        create: {
          teamId,
          websiteId,
          balance: Math.round(gain * 100) / 100,
        },
        update: {
          balance: { increment: Math.round(gain * 100) / 100 },
        },
      }),
    ]);
  } else {
    await prisma.dailyReport.update({
      where: { id: report.id },
      data: { status: "accepted", acceptedAt: new Date(), rejectionNote: null },
    });
  }

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