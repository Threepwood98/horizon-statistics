import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { utcStart } from "@/lib/range";
import { type Shift } from "@/lib/shift";

export const getCurrentUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { team: true },
  });
  if (!user) redirect("/login");

  return { session, user };
});

export async function requireUser() {
  return getCurrentUser();
}

export async function requireRole(...allowed: string[]) {
  const { user } = await getCurrentUser();
  if (allowed.length > 0 && !allowed.includes(user.role)) redirect("/");
  return user;
}

export const getTurnoClosed = cache(
  async (userId: string, dateKey: string, shift: Shift) => {
    const closed = await prisma.turnoClose.findUnique({
      where: { userId_date_shift: { userId, date: utcStart(dateKey), shift } },
    });
    return Boolean(closed);
  },
);