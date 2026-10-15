import { roleLabel } from '@/domain/constants'
import { ROLE_KEYS, withImpliedView } from '@/domain/permissions'
import type { PublicUser, RolePerms, User } from '@/types'
import { ApiError, findOr404, mutate, newId, query, rawMutate } from './db'

const strip = ({ password: _password, ...u }: User): PublicUser => u

export type UserInput = Omit<User, 'id' | 'password'> & { password?: string }

export const usersApi = {
  list: () => query((db) => db.users.map(strip)),

  create: (input: UserInput) =>
    mutate((db, { log }) => {
      if (!input.password) throw new ApiError('رمز عبور الزامی است.')
      assertUniqueUsername(db.users, input.username)
      const u: User = { ...input, password: input.password, id: newId() }
      db.users.push(u)
      log('USER', `ثبت کاربر جدید: ${u.fullName} (${u.username}) — نقش: ${roleLabel(u.role)}`)
      return strip(u)
    }),

  update: (id: string, input: UserInput) =>
    mutate((db, { log }) => {
      const u = findOr404(db.users, id, 'کاربر')
      assertUniqueUsername(db.users, input.username, id)
      const before = structuredClone(u)
      Object.assign(u, { ...input, password: input.password || u.password })
      log('USER', `ویرایش کاربر: ${u.fullName} (${u.username})`, { entity: 'user', id, before })
      return strip(u)
    }),

  remove: (id: string) =>
    mutate((db, { actor, log }) => {
      const u = findOr404(db.users, id, 'کاربر')
      if (u.id === actor.id) throw new ApiError('نمی‌توانید حساب کاربری خودتان را حذف کنید.')
      if (u.role === 'SYSTEM_ADMIN' && db.users.filter((x) => x.role === 'SYSTEM_ADMIN').length <= 1)
        throw new ApiError('حداقل یک مدیر سامانه باید باقی بماند.')
      db.users = db.users.filter((x) => x.id !== id)
      log('USER', `حذف کاربر: ${u.username}`)
    }),

  getRolePerms: () => query((db) => db.rolePerms),

  updateRolePerms: (next: RolePerms) =>
    mutate((db, { log }) => {
      const before = db.rolePerms
      const normalized = Object.fromEntries(ROLE_KEYS.map((r) => [r, withImpliedView(next[r] ?? [])])) as RolePerms
      // جلوگیری از قفل شدن سامانه
      if (!normalized.SYSTEM_ADMIN.includes('users.roles'))
        throw new ApiError('دسترسی «مدیریت دسترسی نقش‌ها» از مدیر سامانه قابل حذف نیست.')
      db.rolePerms = normalized
      log('USER', 'ویرایش دسترسی تب‌ها و سرویس‌ها بر اساس نقش‌ها', { entity: 'rolePerms', before })
      return normalized
    }),
}

export const authApi = {
  /** در بک‌اند واقعی: POST /auth/login → token؛ مقایسه رمز با hash (bcrypt/argon2) */
  login: (username: string, password: string) =>
    rawMutate((db) => {
      const u = db.users.find((x) => x.username === username && x.password === password)
      if (!u) throw new ApiError('نام کاربری یا رمز عبور نادرست است.', 401)
      return strip(u)
    }),
}

function assertUniqueUsername(list: User[], username: string, exceptId?: string) {
  if (list.some((u) => u.username === username && u.id !== exceptId))
    throw new ApiError('این نام کاربری قبلاً ثبت شده است.', 409)
}
