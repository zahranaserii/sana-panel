import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { App as AntApp, ConfigProvider } from 'antd'
import faIR from 'antd/locale/fa_IR'
import { useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { appConfig } from './config'
import { createQueryClient } from './query'
import { createAppRouter } from './router'
import { createTheme } from './theme'
import { ErrorBoundary } from './ui/ErrorBoundary'
import { FeedbackBridge } from './ui/feedback'

/** ریشه اپ: Providerها + Router ساخته‌شده از ماژول‌ها. پیش از رندر configureApp را صدا بزنید. */
export function CoreApp() {
  const [queryClient] = useState(createQueryClient)
  const [router] = useState(createAppRouter)
  const [theme] = useState(() => createTheme(appConfig().theme))
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider direction="rtl" locale={faIR} theme={theme}>
        <AntApp>
          <FeedbackBridge />
          <ErrorBoundary>
            <RouterProvider router={router} />
          </ErrorBoundary>
        </AntApp>
      </ConfigProvider>
      {import.meta.env.DEV && (
        <ErrorBoundary fallback={null}>
          <ReactQueryDevtools buttonPosition="bottom-left" />
        </ErrorBoundary>
      )}
    </QueryClientProvider>
  )
}
