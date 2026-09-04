export function formatMoney(value: number | string): string {
  return `$${Number(value).toFixed(2)}`;
}

export function formatLongDate(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}