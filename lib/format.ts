export function formatMoney(value: number | string): string {
  return `$${Number(value).toFixed(2)}`;
}