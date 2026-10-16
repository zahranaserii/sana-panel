import type { Staff } from '../types'
import { ApiError, findOr404 } from '@/core/data/store'
import { uid as newId } from '@/core/lib/id'
import { sana } from './store'

export type StaffInput = Omit<Staff, 'id' | 'companyId'>

export const staffApi = {
  /** بدون companyId همه پرسنل (برای داشبورد/خروجی) */
  list: (companyId?: string) =>
    sana.query((db) => db.staff.filter((s) => !companyId || s.companyId === companyId)),

  create: (companyId: string, input: StaffInput) =>
    sana.mutate((db, { log }) => {
      const c = findOr404(db.companies, companyId, 'شرکت')
      assertUnique(db.staff, companyId, input.nationalCode)
      const s: Staff = { id: newId(), companyId, ...input }
      db.staff.push(s)
      log('STAFF', `ثبت پرسنل جدید: ${s.fullName} (${c.name})`)
      return s
    }),

  update: (id: string, input: StaffInput) =>
    sana.mutate((db, { log }) => {
      const s = findOr404(db.staff, id, 'پرسنل')
      assertUnique(db.staff, s.companyId, input.nationalCode, id)
      const before = structuredClone(s)
      Object.assign(s, input)
      log('STAFF', `ویرایش پرسنل: ${s.fullName}`, { collection: 'staff', id, before })
      return s
    }),

  remove: (id: string) =>
    sana.mutate((db, { log }) => {
      const s = findOr404(db.staff, id, 'پرسنل')
      if (db.requests.some((r) => r.staffId === id))
        throw new ApiError('برای این پرسنل درخواست وام ثبت شده و قابل حذف نیست.', 409)
      db.staff = db.staff.filter((x) => x.id !== id)
      log('STAFF', `حذف پرسنل: ${s.fullName}`)
    }),

  bulkCreate: (companyId: string, rows: StaffInput[]) =>
    sana.mutate((db, { log }) => {
      const c = findOr404(db.companies, companyId, 'شرکت')
      const added: Staff[] = []
      const skipped: string[] = []
      rows.forEach((r) => {
        if (db.staff.some((s) => s.companyId === companyId && s.nationalCode === r.nationalCode)) {
          skipped.push(r.nationalCode)
          return
        }
        const s = { id: newId(), companyId, ...r }
        db.staff.push(s)
        added.push(s)
      })
      log('STAFF', `بارگذاری گروهی ${added.length} پرسنل از فایل اکسل (${c.name})`)
      return { added: added.length, skipped }
    }),
}

function assertUnique(list: Staff[], companyId: string, nationalCode: string, exceptId?: string) {
  if (list.some((s) => s.companyId === companyId && s.nationalCode === nationalCode && s.id !== exceptId))
    throw new ApiError('پرسنلی با این کد ملی در این شرکت وجود دارد.', 409)
}
