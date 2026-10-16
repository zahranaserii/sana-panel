import { beforeAll, describe, expect, it } from 'vitest'
import { configureApp, type AppConfig } from '../../config'
import type { AppModule } from '../../module/types'

/** localStorage/sessionStorage ساده برای محیط node */
class MemStorage {
  m = new Map<string, string>()
  getItem = (k: string) => this.m.get(k) ?? null
  setItem = (k: string, v: string) => void this.m.set(k, v)
  removeItem = (k: string) => void this.m.delete(k)
  clear = () => this.m.clear()
  key = (i: number) => [...this.m.keys()][i] ?? null
  get length() {
    return this.m.size
  }
}

const testModule: AppModule = {
  key: 't',
  title: 'test',
  pages: [],
  permissions: [{ key: 'items', label: 'آیتم‌ها', services: [['view', 'مشاهده'], ['edit', 'ویرایش']] }],
}
const config: AppConfig = {
  appName: 'test',
  logo: '',
  storagePrefix: 'test',
  orgUnitLabel: 'واحد',
  adminRole: 'ADMIN',
  roles: [
    { value: 'ADMIN', label: 'مدیر', defaultPerms: '*' },
    { value: 'VIEWER', label: 'بیننده', defaultPerms: ['items.view'] },
    { value: 'EDITOR', label: 'ویرایشگر', defaultPerms: ['items'] },
  ],
  initialAdmin: { username: 'admin', password: 'admin', fullName: 'مدیر', userCode: '1', unitName: 'ستاد', unitCode: '1', role: 'ADMIN' },
  demo: { enabled: false, users: [] },
  theme: { primary: '#000000', accent: '#ffffff', siderGradient: ['#000', '#000', '#000'] },
  mockDelay: 0,
}

beforeAll(() => {
  Object.assign(globalThis, { localStorage: new MemStorage(), sessionStorage: new MemStorage() })
  configureApp(config, [testModule])
})

describe('core data layer', async () => {
  const { createMockStore, ApiError } = await import('../store')
  const { authApi, auditApi, rolesApi } = await import('../identity')
  const { useSession } = await import('../../auth/session')

  it('expands default role permissions', async () => {
    const perms = await rolesApi.get()
    expect(perms.ADMIN.sort()).toEqual(['items.edit', 'items.view'])
    expect(perms.VIEWER).toEqual(['items.view'])
    expect(perms.EDITOR.sort()).toEqual(['items.edit', 'items.view'])
  })

  it('requires a session for mutations', async () => {
    const s = createMockStore('t1', () => ({ items: [] as { id: string; n: number }[] }))
    await expect(s.mutate(() => 1)).rejects.toBeInstanceOf(ApiError)
  })

  it('is transactional, writes audit entries, and can roll back', async () => {
    const admin = await authApi.login('admin', 'admin')
    useSession.getState().setSession(admin.id)
    const s = createMockStore('t2', () => ({ items: [{ id: 'a', n: 1 }] }))

    // خطا → هیچ تغییری ذخیره نمی‌شود
    await expect(
      s.mutate((st) => {
        st.items[0].n = 99
        throw new ApiError('fail')
      }),
    ).rejects.toThrow('fail')
    expect((await s.query((st) => st.items))[0].n).toBe(1)

    await s.mutate((st, { log }) => {
      const before = structuredClone(st.items[0])
      st.items[0].n = 2
      log('ITEM', 'ویرایش آیتم', { collection: 'items', id: 'a', before })
    })
    const [entry] = await auditApi.list()
    expect(entry.details).toBe('ویرایش آیتم')
    expect(entry.user).toContain('admin')

    await auditApi.rollback(entry.id)
    expect((await s.query((st) => st.items))[0].n).toBe(1)
    await expect(auditApi.rollback(entry.id)).rejects.toThrow()
  })
})
