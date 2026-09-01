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
  startAmount: number;
  endAmount: number;
}): Promise<ActionResult> {
  const { userId } = await requireAuthedUser();

  const date = toDateKey(input.date);
  const startAmount = Number(input.startAmount);
  const endAmount = Number(input.endAmount);
  const websiteId = Number(input.websiteId);

  if (!input.date) return { error: "Indicá la fecha" };
  if (Number.isNaN(startAmount) || startAmount < 0)
    return { error: "Monto inicial inválido" };
  if (Number.isNaN(endAmount) || endAmount < startAmount)
    return { error: "El monto final no puede ser menor al inicial" };

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
        startAmount: draft.startAmount.add(startAmount),
        endAmount: draft.endAmount.add(endAmount),
      },
    });
  } else {
    await prisma.dailyReport.create({
      data: {
        userId,
        websiteId,
        date,
        startAmount,
        endAmount,
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

  const gain = Number(report.endAmount) - Number(report.startAmount);
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

  await prisma.dailyReport.update({
    where: { id: report.id },
    data: { status: "draft", sentAt: null, acceptedAt: null, rejectionNote: noteText },
  });

  revalidatePath("/reportes");
  revalidatePath("/aprobaciones");
  return { ok: true };
}
