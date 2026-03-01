export function formatOrderDisplayId(
  id: string,
  orderNumber?: string | null
): string {
  if (orderNumber) return orderNumber
  return id.slice(-8).toUpperCase()
}
