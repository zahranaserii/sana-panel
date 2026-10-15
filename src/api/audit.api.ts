import type { Company, LoanRequest, RolePerms, Settings, Staff, User } from '@/types'
import { ApiError, mutate, query } from './db'

export const auditApi = {
  list: () => query((db) => db.audit),

  /** بازگردانی بر اساس شناسه موجودیت (نه ایندکس آرایه) */
  rollback: (entryId: string) =>
    mutate((db, { log }) => {
      const entry = db.audit.find((e) => e.id === entryId)
      if (!entry?.snapshot) throw new ApiError('این عملیات اطلاعات کافی برای بازگردانی ندارد.')
      if (entry.rolledBack) throw new ApiError('این مورد قبلاً بازگردانی شده است.')
      const { entity, id, before } = entry.snapshot
      const replace = <T extends { id: string }>(list: T[]) => {
        const i = list.findIndex((x) => x.id === id)
        if (i < 0) throw new ApiError('موجودیت مربوطه دیگر وجود ندارد.', 404)
        list[i] = before as T
      }
      switch (entity) {
        case 'settings':
          db.settings = before as Settings
          break
        case 'rolePerms':
          db.rolePerms = before as RolePerms
          break
        case 'company':
          replace<Company>(db.companies)
          break
        case 'staff':
          replace<Staff>(db.staff)
          break
        case 'user':
          replace<User>(db.users)
          break
        case 'request':
          replace<LoanRequest>(db.requests)
          break
      }
      entry.rolledBack = true
      log(entry.category, `بازگردانی به حالت قبل: ${entry.details}`)
    }),
}
