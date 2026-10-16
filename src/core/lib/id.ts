/**
 * شناسه یکتا (UUID v4).
 * crypto.randomUUID فقط در «secure context» (https یا localhost) وجود دارد؛ وقتی پنل با
 * http://<IP> در شبکه باز شود undefined است. getRandomValues همه‌جا در دسترس است.
 */
export function uid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40 // version 4
  b[8] = (b[8] & 0x3f) | 0x80 // variant
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
