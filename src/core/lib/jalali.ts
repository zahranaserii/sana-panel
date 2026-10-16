import DateObject from 'react-date-object'
import gregorian from 'react-date-object/calendars/gregorian'
import persian from 'react-date-object/calendars/persian'
import { faDigits, toLatinDigits } from './digits'

/** تاریخ میلادی به شکل YYYY-MM-DD؛ نمایش به‌صورت شمسی در UI انجام می‌شود */
export type ISODate = string

const pad = (n: number) => String(n).padStart(2, '0')

/** ISO را بدون درگیر شدن با timezone به Date محلی تبدیل می‌کند */
export function isoToDate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const dateToISO = (date: Date): ISODate =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const todayISO = () => dateToISO(new Date())

export interface JParts {
  y: number
  m: number
  d: number
}

export function jParts(iso: ISODate): JParts {
  const o = new DateObject({ date: isoToDate(iso), calendar: persian })
  return { y: o.year, m: o.month.number, d: o.day }
}

export function jalaliToISO(y: number, m: number, d: number): ISODate | null {
  const o = new DateObject({ year: y, month: m, day: d, calendar: persian })
  if (!o.isValid) return null
  return dateToISO(o.convert(gregorian).toDate())
}

/** «۱۴۰۴/۰۳/۱۰» یا «1404/3/10» → ISO */
export function parseJalaliString(s: string): ISODate | null {
  const p = toLatinDigits(s).trim().split(/[/\-.]/).map(Number)
  if (p.length !== 3 || p.some((x) => !Number.isFinite(x))) return null
  const [y, m, d] = p
  if (y < 1300 || y > 1500 || m < 1 || m > 12 || d < 1 || d > 31) return null
  return jalaliToISO(y, m, d)
}

export function formatJalali(iso: ISODate | null | undefined, fa = true): string {
  if (!iso) return '—'
  const { y, m, d } = jParts(iso)
  const s = `${y}/${pad(m)}/${pad(d)}`
  return fa ? faDigits(s) : s
}

/** کلید ماه شمسی مثل 1404/03 */
export function jMonthKey(iso: ISODate): string {
  const { y, m } = jParts(iso)
  return `${y}/${pad(m)}`
}

/** تعداد ماه‌های کامل شمسی بین دو تاریخ */
export function jMonthsBetween(fromIso: ISODate, toIso: ISODate): number {
  const a = jParts(fromIso)
  const b = jParts(toIso)
  let months = (b.y - a.y) * 12 + (b.m - a.m)
  if (b.d < a.d) months -= 1
  return months
}

export function prevJMonthKey(iso: ISODate): string {
  const { y, m } = jParts(iso)
  return m === 1 ? `${y - 1}/12` : `${y}/${pad(m - 1)}`
}

export const nowFa = () =>
  new Date().toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })
