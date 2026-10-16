/**
 * هسته هویت: کاربران، دسترسی نقش‌ها و گزارش تغییرات.
 * مستقل از هر پروژه‌ای است؛ نقش‌ها و کاربران اولیه از AppConfig خوانده می‌شوند.
 */
import { appConfig } from '../config'
import { uid } from '../lib/id'
import { nowFa } from '../lib/jalali'
import { allPermissionKeys, withImpliedView } from '../module/registry'
import { sessionUserId } from '../auth/session'
import { type Actor, ApiError, bindIdentity, createMockStore, findOr404, restoreSnapshot, type Snapshot } from './store'

export interface User extends Actor {
  /** فقط در Mock! در بک‌اند واقعی رمز hash می‌شود و هرگز به کلاینت برنمی‌گردد */
  password: string
}
export type PublicUser = Omit<User, 'password'>
export type RolePerms = Record<string, string[]>

export interface AuditEntry {
  id: string
  at: string
  user: string
  category: string
  details: string
  snapshot: Snapshot | null
  rolledBack: boolean
}

interface IdentityState extends Record<string, unknown> {
  users: User[]
  rolePerms: RolePerms
  audit: AuditEntry[]
}

const MAX_AUDIT = 2000

/** 'staff' (بدون نقطه) یعنی همه سرویس‌های آن گروه؛ 'staff.add' یعنی فقط همان سرویس */
function defaultRolePerms(): RolePerms {
  const all = allPermissionKeys()
  const expand = (keys: string[]) => keys.flatMap((k) => (k.includes('.') ? [k] : all.filter((a) => a.startsWith(`${k}.`))))
  return Object.fromEntries(
    appConfig().roles.map((r) => [r.value, r.defaultPerms === '*' ? all : withImpliedView(expand(r.defaultPerms))]),
  )
}

const identity = createMockStore<IdentityState>('identity', () => {
  const c = appConfig()
  const seeds = [c.initialAdmin, ...(c.demo.enabled ? c.demo.users : [])]
  return { users: seeds.map((u) => ({ ...u, id: uid() })), rolePerms: defaultRolePerms(), audit: [] }
})

const actorLabel = (a: Pick<Actor, 'fullName' | 'username'>) => `${a.fullName} (${a.username})`

bindIdentity(
  () => identity.read().users.find((u) => u.id === sessionUserId()) ?? null,
  (actor, entries) => {
    const s = identity.read()
    entries.forEach((e) =>
      s.audit.unshift({
        id: uid(),
        at: nowFa(),
        user: actorLabel(actor),
        category: e.category,
        details: e.details,
        snapshot: e.snapshot ? { ...e.snapshot, store: e.store } : null,
        rolledBack: false,
      }),
    )
    s.audit.length = Math.min(s.audit.length, MAX_AUDIT)
    identity.write(s)
  },
)

/** افزودن سابقه به گزارش تغییرات (برای seed داده نمونه ماژول‌ها) */
export function appendAuditHistory(entries: Omit<AuditEntry, 'id' | 'rolledBack'>[]) {
  const s = identity.read()
  s.audit.push(...entries.map((e) => ({ ...e, id: uid(), rolledBack: false })))
  identity.write(s)
}

const strip = ({ password: _p, ...u }: User): PublicUser => u
const isAdmin = (role: string) => role === appConfig().adminRole

export type UserInput = Omit<User, 'id' | 'password'> & { password?: string }

export const authApi = {
  login: (username: string, password: string) =>
    identity.rawMutate((s) => {
      const u = s.users.find((x) => x.username === username && x.password === password)
      if (!u) throw new ApiError('نام کاربری یا رمز عبور نادرست است.', 401)
      return strip(u)
    }),
}

export const usersApi = {
  list: () => identity.query((s) => s.users.map(strip)),

  create: (input: UserInput) =>
    identity.mutate((s, { log }) => {
      if (!input.password) throw new ApiError('رمز عبور الزامی است.')
      if (s.users.some((u) => u.username === input.username)) throw new ApiError('این نام کاربری قبلاً ثبت شده است.', 409)
      const u: User = { ...input, password: input.password, id: uid() }
      s.users.push(u)
      log('USER', `ثبت کاربر جدید: ${actorLabel(u)}`)
      return strip(u)
    }),

  update: (id: string, input: UserInput) =>
    identity.mutate((s, { log }) => {
      const u = findOr404(s.users, id, 'کاربر')
      if (s.users.some((x) => x.username === input.username && x.id !== id))
        throw new ApiError('این نام کاربری قبلاً ثبت شده است.', 409)
      if (isAdmin(u.role) && !isAdmin(input.role) && s.users.filter((x) => isAdmin(x.role)).length <= 1)
        throw new ApiError('حداقل یک مدیر سامانه باید باقی بماند.')
      const before = structuredClone(u)
      Object.assign(u, { ...input, password: input.password || u.password })
      log('USER', `ویرایش کاربر: ${actorLabel(u)}`, { collection: 'users', id, before })
      return strip(u)
    }),

  remove: (id: string) =>
    identity.mutate((s, { actor, log }) => {
      const u = findOr404(s.users, id, 'کاربر')
      if (u.id === actor.id) throw new ApiError('نمی‌توانید حساب کاربری خودتان را حذف کنید.')
      if (isAdmin(u.role) && s.users.filter((x) => isAdmin(x.role)).length <= 1)
        throw new ApiError('حداقل یک مدیر سامانه باید باقی بماند.')
      s.users = s.users.filter((x) => x.id !== id)
      log('USER', `حذف کاربر: ${u.username}`)
    }),
}

export const rolesApi = {
  get: () => identity.query((s) => s.rolePerms),

  update: (next: RolePerms) =>
    identity.mutate((s, { log }) => {
      const before = s.rolePerms
      s.rolePerms = Object.fromEntries(appConfig().roles.map((r) => [r.value, withImpliedView(next[r.value] ?? [])]))
      log('USER', 'ویرایش دسترسی نقش‌ها', { collection: 'rolePerms', before })
      return s.rolePerms
    }),
}

export const auditApi = {
  list: () => identity.query((s) => s.audit),

  rollback: (entryId: string) =>
    identity.mutate((s, { log }) => {
      const entry = s.audit.find((e) => e.id === entryId)
      if (!entry?.snapshot) throw new ApiError('این عملیات اطلاعات کافی برای بازگردانی ندارد.')
      if (entry.rolledBack) throw new ApiError('این مورد قبلاً بازگردانی شده است.')
      if (entry.snapshot.store === 'identity') {
        // تغییر روی همین store؛ مستقیم روی state جاری اعمال می‌شود
        const { collection, id, before } = entry.snapshot
        if (id) {
          const list = s[collection] as { id: string }[]
          const i = list.findIndex((x) => x.id === id)
          if (i < 0) throw new ApiError('موجودیت مربوطه دیگر وجود ندارد.', 404)
          list[i] = before as { id: string }
        } else s[collection] = before
      } else {
        restoreSnapshot(entry.snapshot)
      }
      entry.rolledBack = true
      log(entry.category, `بازگردانی به حالت قبل: ${entry.details}`)
    }),
}
