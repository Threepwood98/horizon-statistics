"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

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

export async function addReport(input: {
  date: string;
  websiteId: number;
  amount: number;
}): Promise<ActionResult> {
  const { userId } = await requireAuthedUser();

  const date = toDateKey(input.date);
  const amount = Number(input.amount);
  const websiteId = Number(input.websiteId);

  if (!input.date) return { error: "Indicá la fecha" };
  if (Number.isNaN(amount) || amount < 0)
    return { error: "Monto inválido" };

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (date.getTime() > today.getTime())
    return { error: "No podés cargar fechas futuras" };

  const website = await prisma.website.findUnique({ where: { id: websiteId } });
  if (!website) return { error: "Sitio no encontrado" };

  const existingSent = await prisma.dailyReport.findFirst({
    where: { userId, websiteId, date, status: "sent" },
  });
  if (existingSent)
    return { error: "Ya enviaste este sitio para ese día. Esperá la respuesta del manager." };

  const existingAccepted = await prisma.dailyReport.findFirst({
    where: { userId, websiteId, date, status: "accepted" },
  });
  if (existingAccepted)
    return { error: "Ya se aceptó el parte de este sitio para ese día" };

  const draft = await prisma.dailyReport.findFirst({
    where: { userId, websiteId, date, status: "draft" },
  });

  if (draft) {
    await prisma.dailyReport.update({
      where: { id: draft.id },
      data: {
        amount: draft.amount.add(amount),
      },
    });
  } else {
    await prisma.dailyReport.create({
      data: {
        userId,
        websiteId,
        date,
        amount,
        status: "draft",
      },
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
  if (!report.rejectionNote)
    return { error: "Ese reporte no está rechazado" };

  if (report.websiteId != null && Number(report.websiteId) !== websiteId) {
    const collision = await prisma.dailyReport.findFirst({
      where: {
        userId,
        websiteId,
        date: report.date,
        status: { in: ["draft", "sent", "accepted"] },
        NOT: { id: report.id },
      },
    });
    if (collision) return { error: "Ya tenés un reporte para ese sitio ese día" };
  }

  await prisma.dailyReport.update({
    where: { id: report.id },
    data: { websiteId, amount },
  });

  revalidatePath("/reportes");
  return { ok: true };
}

export async function sendPart(date: string): Promise<ActionResult> {
  const { userId, user } = await requireAuthedUser();

  if (user.teamId === null)
    return { error: "No pertenecés a un equipo, no podés enviar el parte" };

  const reports = await prisma.dailyReport.findMany({
    where: { userId, date: toDateKey(date), status: "draft" },
  });
  if (reports.length === 0)
    return { error: "No hay borradores para enviar ese día" };

  await prisma.dailyReport.updateMany({
    where: {
      userId,
      date: toDateKey(date),
      status: "draft",
    },
    data: { status: "sent", sentAt: new Date() },
  });

  revalidatePath("/reportes");
  return { ok: true };
}

export async function resendRectified(
  date: string,
  markedRowIds: number[],
): Promise<ActionResult> {
  const { userId } = await requireAuthedUser();

  const rejected = await prisma.dailyReport.findMany({
    where: { userId, date: toDateKey(date), status: "draft" },
  });
  const rejectedWithNote = rejected.filter((r) => r.rejectionNote);
  if (rejectedWithNote.length === 0)
    return { error: "No hay reportes rechazados para ese día" };

  const markedSet = new Set(markedRowIds.map(Number));
  for (const r of rejectedWithNote) {
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
    where: { id: { in: rejectedWithNote.map((r) => r.id) } },
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
    where: { userId: report.userId, date: report.date, status: "sent" },
  });
  if (dayReports.length === 0)
    return { error: "Ese parte no está pendiente de aprobación" };

  await prisma.$transaction(
    dayReports.map((r) =>
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
  );

  revalidatePath("/reportes");
  revalidatePath("/aprobaciones");
  return { ok: true };
}
