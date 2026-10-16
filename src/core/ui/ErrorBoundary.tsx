import { Button, Result } from 'antd'
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** اگر null باشد، در صورت خطا چیزی نمایش داده نمی‌شود (مثلاً برای devtools) */
  fallback?: ReactNode
}

export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // اینجا محل ارسال خطا به Sentry یا سرویس لاگ است
    console.error(error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    if (this.props.fallback !== undefined) return this.props.fallback
    return (
      <Result
        status="error"
        title="خطای غیرمنتظره"
        subTitle={this.state.error.message}
        extra={<Button onClick={() => location.reload()}>بارگذاری مجدد</Button>}
      />
    )
  }
}
