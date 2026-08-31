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

  const existingSubmitted = await prisma.dailyReport.findFirst({
    where: { userId, websiteId, date, submittedAt: { not: null } },
  });
  if (existingSubmitted)
    return { error: "Ya enviaste el parte de este sitio para ese día" };

  const draft = await prisma.dailyReport.findFirst({
    where: { userId, websiteId, date, submittedAt: null },
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
        submittedAt: null,
      },
    });
  }

  revalidatePath("/reportes");
  return { ok: true };
}

export async function deleteDraft(id: number): Promise<ActionResult> {
  const { userId } = await requireAuthedUser();
  const report = await prisma.dailyReport.findUnique({ where: { id } });
  if (!report || report.userId !== userId || report.submittedAt !== null)
    return { error: "No podés eliminar ese reporte" };
  await prisma.dailyReport.delete({ where: { id } });
  revalidatePath("/reportes");
  return { ok: true };
}

export async function sendPart(date: string): Promise<ActionResult> {
  const { userId } = await requireAuthedUser();

  const reports = await prisma.dailyReport.findMany({
    where: { userId, date: toDateKey(date), submittedAt: null },
  });
  if (reports.length === 0)
    return { error: "No hay borradores para enviar ese día" };

  await prisma.dailyReport.updateMany({
    where: {
      userId,
      date: toDateKey(date),
      submittedAt: null,
    },
    data: { submittedAt: new Date() },
  });

  revalidatePath("/reportes");
  revalidatePath("/");
  return { ok: true };
}