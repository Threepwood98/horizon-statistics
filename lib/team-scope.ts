import type { Prisma } from "@/app/generated/prisma/client";

export type TeamScopeInput = {
  id: string;
  teamId: bigint | null;
};

export function teamScopeFor(
  user: TeamScopeInput,
): Prisma.DailyReportWhereInput {
  return user.teamId != null
    ? { user: { is: { teamId: user.teamId } } }
    : { userId: user.id };
}