import { Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { AppLayout } from './AppLayout'
import { RequireAuth, RequireTab, HomeRedirect } from './guards'
import { LoginPage } from '@/features/auth/LoginPage'
import { ROUTES } from './routes'

const fallback = (
  <div style={{ display: 'grid', placeItems: 'center', minHeight: 300 }}>
    <Spin />
  </div>
)

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomeRedirect /> },
      ...ROUTES.map((r) => ({
        path: r.path,
        handle: { title: r.title },
        element: (
          <RequireTab tab={r.tab}>
            <Suspense fallback={fallback}>{r.element}</Suspense>
          </RequireTab>
        ),
      })),
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
