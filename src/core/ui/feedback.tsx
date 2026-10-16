import { App } from 'antd'
import type { MessageInstance } from 'antd/es/message/interface'
import type { HookAPI } from 'antd/es/modal/useModal'
import { useEffect } from 'react'

/**
 * دسترسی به message/modal antd از بیرون کامپوننت‌ها (مثلاً QueryCache) با حفظ theme و RTL.
 * <FeedbackBridge /> یک بار داخل <App> رندر می‌شود.
 */
let message: MessageInstance | null = null
let modal: HookAPI | null = null

export function FeedbackBridge() {
  const app = App.useApp()
  useEffect(() => {
    message = app.message
    modal = app.modal
  }, [app])
  return null
}

export const notify = {
  success: (text: string) => message?.success(text),
  error: (text: string) => message?.error(text),
  info: (text: string) => message?.info(text),
  warning: (text: string) => message?.warning(text),
}

interface ConfirmOptions {
  title: string
  content?: React.ReactNode
  okText?: string
  danger?: boolean
  width?: number
}

/** تأیید با Promise: `if (await confirm({...})) ...` */
export function confirm(o: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!modal) return resolve(window.confirm(o.title))
    modal.confirm({
      title: o.title,
      content: o.content,
      width: o.width,
      okText: o.okText ?? 'تأیید',
      cancelText: 'انصراف',
      okButtonProps: { danger: o.danger },
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    })
  })
}
