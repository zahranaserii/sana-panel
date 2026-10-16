import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ForbiddenState, PageSkeleton } from '../ui/misc'
import { useCurrentUser, usePermissions } from './hooks'
import { useSession } from './session'

export function RequireAuth({ children }: { children: ReactNode }) {
  const userId = useSession((s) => s.userId)
  const logout = useSession((s) => s.logout)
  const { user, isLoading } = useCurrentUser()
  const location = useLocation()
  const userDeleted = !!userId && !isLoading && !user
  useEffect(() => {
    if (userDeleted) logout()
  }, [userDeleted, logout])
  if (!userId) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (isLoading || userDeleted) return <PageSkeleton />
  return <>{children}</>
}

export function RequirePerm({ perm, children }: { perm: string; children: ReactNode }) {
  const { can, isLoading } = usePermissions()
  if (isLoading) return <PageSkeleton />
  if (!can(perm)) return <ForbiddenState />
  return <>{children}</>
}

/** هدایت به اولین صفحه‌ای که کاربر اجازه دیدنش را دارد */
export function HomeRedirect() {
  const { pages, isLoading } = usePermissions()
  if (isLoading) return <PageSkeleton />
  if (!pages.length) return <ForbiddenState text="برای نقش شما هیچ بخشی فعال نشده است." />
  return <Navigate to={`/${pages[0].path}`} replace />
}
