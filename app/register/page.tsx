import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { RegisterForm } from "@/components/register-form";

export default async function RegisterPage() {
  const [session, userCount] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    prisma.user.count(),
  ]);

  const isFirstUser = userCount === 0;
  if (!isFirstUser && session?.user.role !== "admin") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <RegisterForm isFirstUser={isFirstUser} />
      </div>
    </div>
  );
}
