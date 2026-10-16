import { describe, expect, it } from 'vitest'
import { isValidLegalId, isValidMobile, isValidNationalCode } from '@/core/lib/validators'
import { todayISO } from '@/core/lib/jalali'
import { buildDemoData } from '../../api/seed'
import type { SanaState } from '../../api/store'
import { DEFAULT_SETTINGS } from '../constants'
import { companyCreatedTotal, companyDisbursedTotal } from '../credit'

function seeded() {
  const db: SanaState = { settings: structuredClone(DEFAULT_SETTINGS), companies: [], staff: [], requests: [] }
  const audit = buildDemoData(db)
  return { db, audit }
}

describe('demo seed data', () => {
  const { db, audit } = seeded()

  it('fills every menu', () => {
    expect(db.companies.length).toBeGreaterThanOrEqual(5)
    expect(db.companies.some((c) => c.cancellation)).toBe(true)
    expect(db.companies.some((c) => c.deletedAt)).toBe(true)
    expect(db.staff.length).toBeGreaterThan(30)
    expect(audit.length).toBeGreaterThan(20)
    expect(audit.some((a) => a.snapshot)).toBe(true)
    const statuses = new Set(db.requests.map((r) => r.status))
    expect([...statuses].sort()).toEqual(['APPROVED', 'PENDING_CREDIT', 'PENDING_MANAGER', 'REJECTED', 'REJECTED_MANAGER'])
  })

  it('uses valid, unique identifiers', () => {
    db.companies.forEach((c) => expect(isValidLegalId(c.nationalId)).toBe(true))
    db.staff.forEach((s) => {
      expect(isValidNationalCode(s.nationalCode), s.nationalCode).toBe(true)
      expect(isValidMobile(s.mobile), s.mobile).toBe(true)
    })
    db.companies.forEach((c) => {
      const codes = db.staff.filter((s) => s.companyId === c.id).map((s) => s.nationalCode)
      expect(new Set(codes).size).toBe(codes.length)
    })
  })

  it('keeps references consistent and within credit', () => {
    const today = todayISO()
    db.requests.forEach((r) => {
      expect(db.staff.find((x) => x.id === r.staffId)?.companyId).toBe(r.companyId)
      expect(db.companies.find((c) => c.id === r.companyId)!.plans.some((p) => p.key === r.planKey)).toBe(true)
      expect(r.date <= today).toBe(true)
    })
    db.companies.forEach((c) => {
      const reqs = db.requests.filter((r) => r.companyId === c.id)
      expect(companyDisbursedTotal(reqs)).toBeLessThan(companyCreatedTotal(c, db.settings))
    })
  })
})
