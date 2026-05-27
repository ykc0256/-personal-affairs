export function formatCurrency(value: unknown, currency = "KRW") {
  if (value === null || value === undefined) return "-"

  const amount = typeof value === "number" ? value : Number(value.toString())

  if (!Number.isFinite(amount)) return "-"

  if (currency !== "KRW") {
    return `${amount.toLocaleString("en-US")} ${currency}`
  }

  return `${amount.toLocaleString("ko-KR")}원`
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-"

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString("ko-KR")
}

export function formatCount(value: number | null | undefined, unit = "건") {
  return `${(value ?? 0).toLocaleString("ko-KR")}${unit}`
}
