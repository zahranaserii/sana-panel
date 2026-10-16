import { createElement } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { HomeRedirect, RequireAuth, RequirePerm } from '../auth/guards'
import { LoginPage } from '../auth/LoginPage'
import { AppShell } from '../layout/AppShell'
import { allPages, pagePerm } from '../module/registry'

/** مسیرها خودکار از صفحات ماژول‌های ثبت‌شده ساخته می‌شوند */
export function createAppRouter() {
  return createBrowserRouter([
    { path: '/login', element: <LoginPage /> },
    {
      path: '/',
      element: (
        <RequireAuth>
          <AppShell />
        </RequireAuth>
      ),
      children: [
        { index: true, element: <HomeRedirect /> },
        ...allPages().map((p) => ({
          path: p.path,
          handle: { title: p.title, description: p.description },
          element: <RequirePerm perm={pagePerm(p)}>{createElement(p.component)}</RequirePerm>,
        })),
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ])
}
