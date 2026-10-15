import { type QueryKey, useMutation, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { qk } from './keys'

interface Options<TData> {
  /** کلیدهایی که بعد از موفقیت باید invalidate شوند (audit همیشه اضافه می‌شود) */
  invalidate: QueryKey[]
  successMessage?: string | ((data: TData) => string)
}

/**
 * useMutation با پیام موفقیت/خطا و invalidate خودکار.
 * خطاهای ApiError با message فارسی نمایش داده می‌شوند.
 */
export function useApiMutation<TVars, TData = unknown>(
  fn: (vars: TVars) => Promise<TData>,
  { invalidate, successMessage }: Options<TData>,
) {
  const qc = useQueryClient()
  const { message } = App.useApp()
  return useMutation({
    mutationFn: fn,
    onSuccess: async (data) => {
      await Promise.all([...invalidate, qk.audit].map((queryKey) => qc.invalidateQueries({ queryKey })))
      if (successMessage) message.success(typeof successMessage === 'function' ? successMessage(data) : successMessage)
    },
    onError: (err) => {
      message.error(err instanceof Error ? err.message : 'خطای ناشناخته')
    },
  })
}
