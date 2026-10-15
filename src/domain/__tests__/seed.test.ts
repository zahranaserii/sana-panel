import { describe, expect, it } from 'vitest'
import type { DB } from '@/api/db'
import { buildDemoData } from '@/api/seed'
import { DEFAULT_SETTINGS } from '@/domain/constants'
import { companyCreatedTotal, companyDisbursedTotal } from '@/domain/credit'
import { DEFAULT_ROLE_PERMS } from '@/domain/permissions'
import { todayISO } from '@/lib/jalali'
import { isValidLegalId, isValidMobile, isValidNationalCode } from '@/lib/validators'

function seeded(): DB {
  const db: DB = {
    version: 1,
    settings: structuredClone(DEFAULT_SETTINGS),
    companies: [],
    staff: [],
    requests: [],
    users: [{ id: 'a', username: 'admin', password: 'admin', fullName: 'مدیر سامانه', userCode: '001', branchName: 'ستاد', branchCode: '150000', role: 'SYSTEM_ADMIN' }],
    rolePerms: structuredClone(DEFAULT_ROLE_PERMS),
    audit: [],
  }
  buildDemoData(db)
  return db
}

describe('demo seed data', () => {
  const db = seeded()

  it('fills every menu', () => {
    expect(db.companies.length).toBeGreaterThanOrEqual(5)
    expect(db.companies.some((c) => c.cancellation)).toBe(true)
    expect(db.companies.some((c) => c.deletedAt)).toBe(true)
    expect(db.staff.length).toBeGreaterThan(30)
    expect(db.audit.length).toBeGreaterThan(20)
    expect(new Set(db.users.map((u) => u.role)).size).toBe(5)
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
      const s = db.staff.find((x) => x.id === r.staffId)
      expect(s?.companyId).toBe(r.companyId)
      expect(db.companies.find((c) => c.id === r.companyId)!.plans.some((p) => p.key === r.planKey)).toBe(true)
      expect(r.date <= today).toBe(true)
    })
    db.companies.forEach((c) => {
      const reqs = db.requests.filter((r) => r.companyId === c.id)
      expect(companyDisbursedTotal(reqs)).toBeLessThan(companyCreatedTotal(c, db.settings))
    })
  })
})
