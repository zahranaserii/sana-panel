import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { appConfig } from '../config'
import { rolesApi, usersApi } from '../data/identity'
import { allPages, pagePerm } from '../module/registry'
import { coreKeys } from '../query/keys'
import { useSession } from './session'

export const useUsers = () => useQuery({ queryKey: coreKeys.users, queryFn: usersApi.list })
export const useRolePerms = () => useQuery({ queryKey: coreKeys.roles, queryFn: rolesApi.get })

/** کاربر جاری (نسخه زنده از لیست کاربران تا تغییر نقش فوراً اعمال شود) */
export function useCurrentUser() {
  const userId = useSession((s) => s.userId)
  const users = useUsers()
  return { user: users.data?.find((u) => u.id === userId) ?? null, isLoading: users.isLoading }
}

export const roleDef = (role: string) => appConfig().roles.find((r) => r.value === role)
export const roleLabel = (role: string) => roleDef(role)?.label ?? role

/**
 * فقط برای UX (مخفی‌کردن دکمه‌ها و منوها).
 * کنترل دسترسی واقعی باید در بک‌اند روی هر endpoint انجام شود.
 */
export function usePermissions() {
  const { user, isLoading: userLoading } = useCurrentUser()
  const perms = useRolePerms()
  const isAdmin = user?.role === appConfig().adminRole
  const set = useMemo(() => new Set(user && perms.data ? perms.data[user.role] ?? [] : []), [user, perms.data])
  const can = useCallback((key: string) => isAdmin || set.has(key), [isAdmin, set])
  const pages = useMemo(() => allPages().filter((p) => can(pagePerm(p))), [can])
  return { can, pages, isAdmin, isLoading: userLoading || perms.isLoading }
}
