"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export type RegisterState = {
  error?: string;
  success?: string;
};

const PLACEHOLDER_EMAIL_DOMAIN = "horizon.local";

export async function createUser(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const [session, userCount] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    prisma.user.count(),
  ]);

  if (userCount > 0 && session?.user.role !== "admin") {
    return { error: "No autorizado" };
  }

  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = formData.get("role") === "admin" ? "admin" : "user";

  if (!name || !username || !password) {
    return { error: "Todos los campos son obligatorios" };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" };
  }

  const email = `${username.toLowerCase()}@${PLACEHOLDER_EMAIL_DOMAIN}`;

  try {
    await auth.api.signUpEmail({
      body: { name, username, password, email },
    });
  } catch (error) {
    console.error(error);
    return { error: "No se pudo crear el usuario (¿ya existe?)" };
  }

  if (role !== "user") {
    await prisma.user.update({ where: { email }, data: { role } });
  }

  return { success: `Usuario "${username}" creado con rol ${role}` };
}
