import { useCallback, useMemo } from 'react'
import { useAuthStore } from '@/store/auth'
import { TABS, type TabKey } from '@/domain/permissions'
import { useRolePerms, useUsers } from './index'

/** کاربر جاری (نسخه زنده از لیست کاربران، تا تغییر نقش فوراً اعمال شود) */
export function useCurrentUser() {
  const userId = useAuthStore((s) => s.userId)
  const users = useUsers()
  const user = users.data?.find((u) => u.id === userId) ?? null
  return { user, isLoading: users.isLoading }
}

/**
 * توجه: این فقط برای UX است (مخفی کردن دکمه‌ها).
 * کنترل دسترسی واقعی باید در بک‌اند روی هر endpoint انجام شود.
 */
export function usePermissions() {
  const { user, isLoading: userLoading } = useCurrentUser()
  const perms = useRolePerms()
  const set = useMemo(
    () => new Set(user && perms.data ? perms.data[user.role] ?? [] : []),
    [user, perms.data],
  )
  const can = useCallback((key: string) => set.has(key), [set])
  const allowedTabs = useMemo(() => TABS.filter((t) => set.has(`${t.key}.view`)).map((t) => t.key), [set])
  return {
    can,
    canView: (tab: TabKey) => set.has(`${tab}.view`),
    allowedTabs,
    isLoading: userLoading || perms.isLoading,
  }
}
