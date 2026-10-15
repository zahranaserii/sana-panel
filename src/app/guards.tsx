import { Result, Spin } from 'antd'
import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { TabKey } from '@/domain/permissions'
import { useCurrentUser, usePermissions } from '@/queries/auth'
import { useAuthStore } from '@/store/auth'
import { ROUTES } from './routes'

const Loading = () => (
  <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
    <Spin size="large" />
  </div>
)

export function RequireAuth({ children }: { children: ReactNode }) {
  const userId = useAuthStore((s) => s.userId)
  const logout = useAuthStore((s) => s.logout)
  const { user, isLoading } = useCurrentUser()
  const location = useLocation()
  const userDeleted = !!userId && !isLoading && !user
  useEffect(() => {
    if (userDeleted) logout()
  }, [userDeleted, logout])
  if (!userId) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (isLoading || userDeleted) return <Loading />
  return <>{children}</>
}

export function RequireTab({ tab, children }: { tab: TabKey; children: ReactNode }) {
  const { canView, isLoading } = usePermissions()
  if (isLoading) return <Loading />
  if (!canView(tab)) return <Result status="403" title="۴۰۳" subTitle="شما به این بخش دسترسی ندارید." />
  return <>{children}</>
}

export function HomeRedirect() {
  const { allowedTabs, isLoading } = usePermissions()
  if (isLoading) return <Loading />
  const first = ROUTES.find((r) => allowedTabs.includes(r.tab))
  if (!first) return <Result status="403" subTitle="برای نقش شما هیچ بخشی فعال نشده است." />
  return <Navigate to={`/${first.path}`} replace />
}
