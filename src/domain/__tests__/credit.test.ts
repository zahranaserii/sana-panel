import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@/domain/constants'
import {
  buildPlanMatrix,
  companyDisbursedTotal,
  eligibilityInfo,
  planAvailableCredit,
  planCreatedCumulative,
} from '@/domain/credit'
import { jalaliToISO } from '@/lib/jalali'
import type { Company, LoanRequest, RequestStatus } from '@/types'

const s = DEFAULT_SETTINGS
const matrix = buildPlanMatrix(s)
const qarz12 = matrix.find((p) => p.key === 'QARZ|12|4')!

const company = (over: Partial<Company> = {}): Company => ({
  id: 'c1',
  name: 'تست',
  nationalId: '',
  agreementNo: '',
  account: '',
  contractDate: jalaliToISO(1404, 1, 10)!,
  openDate: jalaliToISO(1404, 1, 15)!,
  sepah: false,
  agreementFile: '',
  plans: [{ ...qarz12, sharePercent: 100 }],
  monthlyAverages: [1_000_000_000, 1_000_000_000, ...Array(10).fill(null)],
  avgDocs: [],
  registeredBy: null,
  createdAt: '',
  cancellation: null,
  deletedAt: null,
  ...over,
})

const req = (amount: number, status: RequestStatus, date = jalaliToISO(1404, 3, 15)!): LoanRequest => ({
  id: Math.random().toString(),
  companyId: 'c1',
  staffId: 's',
  staffName: 's',
  planKey: qarz12.key,
  planLabel: '',
  amount,
  paymentOrder: 1,
  status,
  date,
  decidedAt: null,
  note: '',
  fileName: '',
  rejectReason: '',
  postStage: '',
  noGrantReason: '',
})

describe('buildPlanMatrix', () => {
  it('builds (murRates + 1) × terms combinations', () => {
    expect(matrix).toHaveLength((s.murRates.length + 1) * s.terms.length)
    expect(qarz12.usable).toBe(8)
  })
})

describe('credit calculation', () => {
  it('cumulative credit = usable% × multiplier × sum(averages) × share%', () => {
    expect(planCreatedCumulative(company(), company().plans[0], s)).toBe(160_000_000) // 8% × 2e9
  })

  it('applies the Sepah multiplier only when enabled in settings', () => {
    const c = company({ sepah: true })
    expect(planCreatedCumulative(c, c.plans[0], s)).toBeCloseTo(176_000_000)
    expect(planCreatedCumulative(c, c.plans[0], { ...s, sepahEnabled: false })).toBe(160_000_000)
  })

  it('both manager and credit rejections release credit (bug in HTML version)', () => {
    const reqs = [req(10, 'APPROVED'), req(20, 'PENDING_MANAGER'), req(40, 'REJECTED'), req(80, 'REJECTED_MANAGER')]
    expect(companyDisbursedTotal(reqs)).toBe(30)
  })
})

describe('eligibilityInfo', () => {
  it('requires `delay` months after contract and the transfer day of month', () => {
    const c = company()
    expect(eligibilityInfo(c, [], jalaliToISO(1404, 1, 15)!, s).eligible).toBe(false)
    const e = eligibilityInfo(c, [], jalaliToISO(1404, 2, 15)!, s)
    expect(e.eligible).toBe(true)
    expect(e.transferDay).toBe(true)
    expect(eligibilityInfo(c, [], jalaliToISO(1404, 2, 16)!, s).transferDay).toBe(false)
  })

  it('usage in previous month limits credit to this month only; a rejected request does not count', () => {
    const c = company()
    const today = jalaliToISO(1404, 4, 15)!
    const used = [req(1_000, 'APPROVED', jalaliToISO(1404, 3, 15)!)]
    const e1 = eligibilityInfo(c, used, today, s)
    expect(e1.usedLastMonth).toBe(true)
    expect(planAvailableCredit(c, c.plans[0], used, e1, s)).toBe(80_000_000) // 8% × last average

    const rejected = [req(1_000, 'REJECTED', jalaliToISO(1404, 3, 15)!)]
    expect(eligibilityInfo(c, rejected, today, s).usedLastMonth).toBe(false)
  })
})
