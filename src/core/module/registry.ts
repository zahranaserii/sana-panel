import { appModules } from '../config'
import type { AuditCategoryDef, PageDef, PermissionGroup } from './types'

export const pagePerm = (p: PageDef) => p.perm ?? `${p.path}.view`

export const allPages = (): PageDef[] => appModules().flatMap((m) => m.pages)

export const allPermissionGroups = (): PermissionGroup[] => appModules().flatMap((m) => m.permissions)

export const allPermissionKeys = (): string[] =>
  allPermissionGroups().flatMap((g) => g.services.map(([s]) => `${g.key}.${s}`))

export const auditCategories = (): AuditCategoryDef[] => appModules().flatMap((m) => m.auditCategories ?? [])

export const auditCategory = (value: string): AuditCategoryDef =>
  auditCategories().find((c) => c.value === value) ?? { value, label: value }

/** گروه‌های منو به ترتیب ظاهر شدن در ماژول‌ها */
export function menuGroups(pages: PageDef[]): { label: string; pages: PageDef[] }[] {
  const groups: { label: string; pages: PageDef[] }[] = []
  pages
    .filter((p) => !p.hideInMenu)
    .forEach((p) => {
      const label = p.group ?? ''
      let g = groups.find((x) => x.label === label)
      if (!g) groups.push((g = { label, pages: [] }))
      g.pages.push(p)
    })
  return groups
}

/** اگر سرویسی از یک گروه فعال است، «مشاهده» همان گروه هم لازم است */
export function withImpliedView(perms: string[]): string[] {
  const set = new Set(perms)
  perms.forEach((p) => set.add(`${p.split('.')[0]}.view`))
  return [...set]
}
