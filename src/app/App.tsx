import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { App as AntApp, ConfigProvider } from 'antd'
import faIR from 'antd/locale/fa_IR'
import { RouterProvider } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { router } from './router'
import { theme } from './theme'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider direction="rtl" locale={faIR} theme={theme}>
        <AntApp>
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
