/**
 * منطق محاسبه اعتبار — توابع خالص (Pure) تا هم در UI و هم در لایه API استفاده شوند
 * و به‌راحتی تست‌پذیر باشند. در نسخه واقعی باید همین منطق در بک‌اند تکرار/اعمال شود.
 */
import { faDigits } from '@/core/lib/digits'
import { jMonthKey, jMonthsBetween, jParts, prevJMonthKey } from '@/core/lib/jalali'
import type { Company, CompanyPlan, ISODate, LoanRequest, PlanOption, Settings } from '../types'
import { isConsuming } from './constants'

export const planTypeLabel = (t: PlanOption['type']) => (t === 'QARZ' ? 'قرض‌الحسنه' : 'مرابحه')
export const planKeyOf = (p: Pick<PlanOption, 'type' | 'term' | 'rate'>) => `${p.type}|${p.term}|${p.rate}`
export const planLabel = (p: Pick<PlanOption, 'type' | 'term' | 'rate'>) =>
  `${planTypeLabel(p.type)} - ${faDigits(p.rate)}٪ - ${faDigits(p.term)} ماه`

/** ماتریس کامل ترکیب‌های طرح (نوع × نرخ × مدت) */
export function buildPlanMatrix(s: Settings): PlanOption[] {
  const rows: PlanOption[] = []
  s.terms.forEach((term, ti) => {
    const usable = s.usable[ti]?.[0] ?? 0
    rows.push({ type: 'QARZ', rate: s.qarzRate, term, usable, key: planKeyOf({ type: 'QARZ', rate: s.qarzRate, term }) })
  })
  s.murRates.forEach((rate, ri) => {
    s.terms.forEach((term, ti) => {
      const usable = s.usable[ti]?.[ri + 1] ?? 0
      rows.push({ type: 'MURABAHA', rate, term, usable, key: planKeyOf({ type: 'MURABAHA', rate, term }) })
    })
  })
  return rows
}

export const sumAverages = (c: Company) => c.monthlyAverages.reduce<number>((s, v) => s + (v || 0), 0)

export function lastAverage(c: Company) {
  let v = 0
  c.monthlyAverages.forEach((x) => {
    if (x && x > 0) v = x
  })
  return v
}

export const companyMultiplier = (c: Company, s: Settings) => (s.sepahEnabled && c.sepah ? s.multYes : 1)

const planFactor = (c: Company, p: CompanyPlan, s: Settings) =>
  (p.usable / 100) * companyMultiplier(c, s) * (p.sharePercent / 100)

export const planCreatedCumulative = (c: Company, p: CompanyPlan, s: Settings) => planFactor(c, p, s) * sumAverages(c)
export const planCreatedThisMonth = (c: Company, p: CompanyPlan, s: Settings) => planFactor(c, p, s) * lastAverage(c)

export const planDisbursed = (reqs: LoanRequest[], planKey: string) =>
  reqs.filter((r) => isConsuming(r.status) && r.planKey === planKey).reduce((s, r) => s + r.amount, 0)

export const companyDisbursedTotal = (reqs: LoanRequest[]) =>
  reqs.filter((r) => isConsuming(r.status)).reduce((s, r) => s + r.amount, 0)

export const companyCreatedTotal = (c: Company, s: Settings) =>
  c.plans.reduce((sum, p) => sum + planCreatedCumulative(c, p, s), 0)

export interface Eligibility {
  /** مهلت پس از قرارداد گذشته است */
  eligible: boolean
  /** امروز روز مجاز انتقال (روز افتتاح حساب) است */
  transferDay: boolean
  /** ماه قبل از اعتبار استفاده شده (فقط اعتبار همین ماه مجاز است) */
  usedLastMonth: boolean
  transferDayOfMonth: number
}

export function eligibilityInfo(
  c: Company,
  reqs: LoanRequest[],
  today: ISODate,
  s: Settings,
): Eligibility {
  const months = jMonthsBetween(c.contractDate, today)
  const openDay = jParts(c.openDate || c.contractDate).d
  const prevKey = prevJMonthKey(today)
  // برخلاف نسخه HTML، «استفاده در ماه قبل» از روی درخواست‌های غیرِ ردشده محاسبه می‌شود
  // تا یک درخواستِ ردشده باعث قفل شدن مانده انباشته نشود.
  const usedLastMonth = reqs.some((r) => isConsuming(r.status) && jMonthKey(r.date) === prevKey)
  return {
    eligible: months >= s.delay,
    transferDay: jParts(today).d === openDay,
    usedLastMonth,
    transferDayOfMonth: openDay,
  }
}

export function planAvailableCredit(
  c: Company,
  p: CompanyPlan,
  reqs: LoanRequest[],
  elig: Eligibility,
  s: Settings,
) {
  if (elig.usedLastMonth) return Math.max(0, planCreatedThisMonth(c, p, s))
  return Math.max(0, planCreatedCumulative(c, p, s) - planDisbursed(reqs, p.key))
}

/** مانده اعتبار تا ماه i ام (برای جدول میانگین‌ها) */
export function remainingAsOfMonth(c: Company, reqs: LoanRequest[], uptoIndex: number, s: Settings) {
  const sumUpTo = c.monthlyAverages.slice(0, uptoIndex + 1).reduce<number>((a, v) => a + (v || 0), 0)
  const mult = companyMultiplier(c, s)
  const created = c.plans.reduce((a, p) => a + (p.usable / 100) * mult * sumUpTo * (p.sharePercent / 100), 0)
  return Math.max(0, created - companyDisbursedTotal(reqs))
}

export type ContractStatus = { color: string; text: string; active: boolean }

export function contractStatus(c: Company): ContractStatus {
  if (c.deletedAt) return { color: 'default', text: 'حذف‌شده', active: false }
  if (c.cancellation) return { color: 'red', text: `لغوشده (${c.cancellation.reason})`, active: false }
  // طبق دستورالعمل: تمدید خودکار در صورت عدم لغو
  return { color: 'green', text: 'فعال (تمدید خودکار)', active: true }
}

export const isActiveCompany = (c: Company) => !c.deletedAt && !c.cancellation
