/**
 * Mock Backend روی localStorage.
 * همه توابع async هستند و شکل یک REST API را دارند تا بعداً فقط پیاده‌سازی
 * فایل‌های *.api.ts با axios/fetch جایگزین شود و هوک‌های React Query دست نخورند.
 */
import { DEFAULT_SETTINGS } from '@/domain/constants'
import { DEFAULT_ROLE_PERMS } from '@/domain/permissions'
import { nowFa } from '@/lib/jalali'
import { useAuthStore } from '@/store/auth'
import type {
  AuditCategory,
  AuditEntry,
  Company,
  LoanRequest,
  RolePerms,
  Settings,
  SnapshotEntity,
  Staff,
  User,
} from '@/types'
import { buildDemoData } from './seed'

export interface DB {
  version: 1
  settings: Settings
  companies: Company[]
  staff: Staff[]
  requests: LoanRequest[]
  users: User[]
  rolePerms: RolePerms
  audit: AuditEntry[]
}

const KEY = 'sana-db-v1'
const DELAY = Number(import.meta.env.VITE_MOCK_DELAY ?? 150)
const MAX_AUDIT = 2000

export class ApiError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export const newId = () => crypto.randomUUID()

function emptyDb(): DB {
  const db: DB = {
    version: 1,
    settings: structuredClone(DEFAULT_SETTINGS),
    companies: [],
    staff: [],
    requests: [],
    users: [
      {
        id: newId(),
        username: 'admin',
        password: 'admin',
        fullName: 'مدیر سامانه',
        userCode: '001',
        branchName: 'ستاد مرکزی',
        branchCode: '150000',
        role: 'SYSTEM_ADMIN',
      },
    ],
    rolePerms: structuredClone(DEFAULT_ROLE_PERMS),
    audit: [],
  }
  if (import.meta.env.VITE_DEMO_DATA === 'true') buildDemoData(db)
  return db
}

function load(): DB {
  const raw = localStorage.getItem(KEY)
  if (raw) {
    try {
      return JSON.parse(raw) as DB
    } catch {
      /* داده خراب؛ از نو ساخته می‌شود */
    }
  }
  const db = emptyDb()
  localStorage.setItem(KEY, JSON.stringify(db))
  return db
}

const sleep = () => new Promise((r) => setTimeout(r, DELAY))

export async function query<T>(fn: (db: DB) => T): Promise<T> {
  await sleep()
  return structuredClone(fn(load()))
}

export interface MutationCtx {
  actor: User
  log: (
    category: AuditCategory,
    details: string,
    snapshot?: { entity: SnapshotEntity; id?: string; before: unknown },
  ) => void
}

/**
 * عملیات نوشتن «تراکنشی»: روی یک کپی کار می‌کند و فقط در صورت موفقیت ذخیره می‌شود؛
 * اگر ApiError پرتاب شود هیچ تغییری اعمال نمی‌شود.
 */
export async function mutate<T>(fn: (db: DB, ctx: MutationCtx) => T): Promise<T> {
  await sleep()
  const db = structuredClone(load())
  const actor = db.users.find((u) => u.id === useAuthStore.getState().userId)
  if (!actor) throw new ApiError('نشست کاربری معتبر نیست؛ دوباره وارد شوید.', 401)
  const ctx: MutationCtx = {
    actor,
    log: (category, details, snapshot) => {
      db.audit.unshift({
        id: newId(),
        at: nowFa(),
        user: `${actor.fullName} (${actor.username})`,
        category,
        details,
        snapshot: snapshot ? { ...snapshot, before: structuredClone(snapshot.before) } : null,
        rolledBack: false,
      })
      if (db.audit.length > MAX_AUDIT) db.audit.length = MAX_AUDIT
    },
  }
  const result = fn(db, ctx)
  localStorage.setItem(KEY, JSON.stringify(db))
  return structuredClone(result)
}

/** نوشتن بدون نیاز به نشست (فقط برای لاگین) */
export async function rawMutate<T>(fn: (db: DB) => T): Promise<T> {
  await sleep()
  const db = structuredClone(load())
  const r = fn(db)
  localStorage.setItem(KEY, JSON.stringify(db))
  return structuredClone(r)
}

export function resetDb() {
  localStorage.removeItem(KEY)
}

export function findOr404<T extends { id: string }>(list: T[], id: string, what: string): T {
  const item = list.find((x) => x.id === id)
  if (!item) throw new ApiError(`${what} یافت نشد.`, 404)
  return item
}
