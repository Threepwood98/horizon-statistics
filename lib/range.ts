type RangeParams = {
  range?: string;
  from?: string;
  to?: string;
};

type RangeResult = {
  range: "week" | "month" | "custom";
  where: { gte: Date; lt: Date };
  rangeLabel: string;
};

export function toKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function utcStart(key: string): Date {
  return new Date(`${key}T00:00:00Z`);
}

export function addDaysKey(key: string, days: number): string {
  const date = utcStart(key);
  date.setUTCDate(date.getUTCDate() + days);
  return toKey(date);
}

export function formatDateLabelUTC(key: string): string {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function parseDate(value: string | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = utcStart(value);
  return Number.isNaN(date.getTime()) ? null : value;
}

export function getRange(params: RangeParams, now = new Date()): RangeResult {
  const todayKey = localDateKey(now);
  const tomorrowKey = addDaysKey(todayKey, 1);
  const tomorrowStart = utcStart(tomorrowKey);

  const monthRange = (): RangeResult => ({
    range: "month",
    where: { gte: utcStart(`${todayKey.slice(0, 8)}01`), lt: tomorrowStart },
    rangeLabel: "mes actual",
  });

  switch (params.range) {
    case "week": {
      const dayOfWeek = now.getDay();
      const offset = (dayOfWeek + 6) % 7;
      return {
        range: "week",
        where: {
          gte: utcStart(addDaysKey(todayKey, -offset)),
          lt: tomorrowStart,
        },
        rangeLabel: "semana actual",
      };
    }
    case "custom": {
      const from = parseDate(params.from);
      const to = parseDate(params.to);
      if (from && to && from <= to) {
        const toEndKey = addDaysKey(to, 1);
        return {
          range: "custom",
          where: {
            gte: utcStart(from),
            lt:
              toEndKey <= tomorrowKey
                ? utcStart(toEndKey)
                : tomorrowStart,
          },
          rangeLabel: `${formatDateLabelUTC(from)} – ${formatDateLabelUTC(to)}`,
        };
      }
      break;
    }
    case "month":
    default:
      return monthRange();
  }

  return monthRange();
}