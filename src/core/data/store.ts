/**
 * Mock Backend عمومی روی localStorage.
 * هر ماژول با createMockStore یک «دیتابیس» مستقل برای خودش می‌سازد.
 * توابع async و شکل REST دارند؛ برای اتصال به بک‌اند واقعی فقط فایل‌های *.api.ts ماژول
 * با درخواست HTTP جایگزین می‌شوند و هوک‌ها/UI تغییر نمی‌کنند.
 */
import { appConfig } from '../config'

export class ApiError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export interface Actor {
  id: string
  username: string
  fullName: string
  userCode: string
  unitName: string
  unitCode: string
  role: string
}

export interface Snapshot {
  store: string
  collection: string
  /** اگر باشد، آیتم با این شناسه در آرایه collection جایگزین می‌شود؛ وگرنه کل collection */
  id?: string
  before: unknown
}

export interface AuditDraft {
  category: string
  details: string
  snapshot?: Omit<Snapshot, 'store'>
}

export interface MutationCtx {
  actor: Actor
  /** ثبت در گزارش تغییرات؛ فقط اگر عملیات موفق باشد ذخیره می‌شود */
  log: (category: string, details: string, snapshot?: Omit<Snapshot, 'store'>) => void
}

// ---- اتصال به هسته هویت (identity) بدون وابستگی چرخشی ----
let resolveActor: () => Actor | null = () => null
let auditSink: (actor: Actor, entries: (AuditDraft & { store: string })[]) => void = () => {}
export function bindIdentity(r: typeof resolveActor, s: typeof auditSink) {
  resolveActor = r
  auditSink = s
}

const registry = new Map<string, MockStore<Record<string, unknown>>>()

export interface MockStore<S> {
  name: string
  query<T>(fn: (s: S) => T): Promise<T>
  /** نوشتن تراکنشی با نیاز به نشست کاربر */
  mutate<T>(fn: (s: S, ctx: MutationCtx) => T): Promise<T>
  /** نوشتن بدون نشست (مثلاً لاگین) */
  rawMutate<T>(fn: (s: S) => T): Promise<T>
  /** دسترسی همگام — فقط برای seed و تست */
  read(): S
  write(s: S): void
}

const sleep = () => new Promise((r) => setTimeout(r, appConfig().mockDelay))
const clone = <T,>(v: T): T => structuredClone(v)

export function storageKey(name: string) {
  return `${appConfig().storagePrefix}:${name}`
}

export function createMockStore<S extends Record<string, unknown>>(name: string, init: () => S): MockStore<S> {
  const key = () => storageKey(name)
  const read = (): S => {
    const raw = localStorage.getItem(key())
    if (raw) {
      try {
        return JSON.parse(raw) as S
      } catch {
        /* داده خراب؛ از نو ساخته می‌شود */
      }
    }
    const s = init()
    localStorage.setItem(key(), JSON.stringify(s))
    return s
  }
  const write = (s: S) => localStorage.setItem(key(), JSON.stringify(s))

  const store: MockStore<S> = {
    name,
    read,
    write,
    async query(fn) {
      await sleep()
      return clone(fn(read()))
    },
    async rawMutate(fn) {
      await sleep()
      const s = clone(read())
      const r = fn(s)
      write(s)
      return clone(r)
    },
    async mutate(fn) {
      await sleep()
      const actor = resolveActor()
      if (!actor) throw new ApiError('نشست کاربری معتبر نیست؛ دوباره وارد شوید.', 401)
      const s = clone(read())
      const entries: (AuditDraft & { store: string })[] = []
      const r = fn(s, {
        actor,
        log: (category, details, snapshot) =>
          entries.push({ category, details, store: name, snapshot: snapshot && { ...snapshot, before: clone(snapshot.before) } }),
      })
      write(s)
      if (entries.length) auditSink(actor, entries)
      return clone(r)
    },
  }
  registry.set(name, store as unknown as MockStore<Record<string, unknown>>)
  return store
}

/** بازگرداندن یک snapshot (برای «بازگردانی» در گزارش تغییرات) */
export function restoreSnapshot(snap: Snapshot) {
  const store = registry.get(snap.store)
  if (!store) throw new ApiError('منبع داده این تغییر دیگر وجود ندارد.', 404)
  const s = store.read()
  if (snap.id) {
    const list = s[snap.collection] as { id: string }[] | undefined
    const i = list?.findIndex((x) => x.id === snap.id) ?? -1
    if (!list || i < 0) throw new ApiError('موجودیت مربوطه دیگر وجود ندارد.', 404)
    list[i] = snap.before as { id: string }
  } else {
    s[snap.collection] = snap.before
  }
  store.write(s)
}

/** پاک کردن همه داده‌های این پروژه (بازنشانی دمو) */
export function resetAllStores() {
  const prefix = `${appConfig().storagePrefix}:`
  Object.keys(localStorage)
    .filter((k) => k.startsWith(prefix))
    .forEach((k) => localStorage.removeItem(k))
}

export function findOr404<T extends { id: string }>(list: T[], id: string, what: string): T {
  const item = list.find((x) => x.id === id)
  if (!item) throw new ApiError(`${what} یافت نشد.`, 404)
  return item
}
