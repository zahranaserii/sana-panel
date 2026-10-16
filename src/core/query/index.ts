import { MutationCache, QueryCache, QueryClient, type QueryKey, useMutation, useQueryClient } from '@tanstack/react-query'
import { notify } from '../ui/feedback'
import { coreKeys } from './keys'

export { coreKeys } from './keys'

const errorText = (e: unknown) => (e instanceof Error ? e.message : 'خطای ناشناخته')

/** QueryClient با نمایش سراسری خطا — هیچ خطای بارگذاری داده بی‌صدا نمی‌ماند */
export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError: (e) => notify.error(`خطا در دریافت اطلاعات: ${errorText(e)}`) }),
    mutationCache: new MutationCache({
      onError: (e, _v, _c, m) => {
        if (!m.options.meta?.silent) notify.error(errorText(e))
      },
    }),
    defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
  })
}

interface Options<TData> {
  /** کلیدهایی که بعد از موفقیت باید invalidate شوند (گزارش تغییرات همیشه اضافه می‌شود) */
  invalidate: QueryKey[]
  successMessage?: string | ((data: TData) => string)
}

/** useMutation با پیام موفقیت و invalidate خودکار؛ خطا به‌صورت سراسری نمایش داده می‌شود */
export function useApiMutation<TVars, TData = unknown>(fn: (vars: TVars) => Promise<TData>, o: Options<TData>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: async (data) => {
      await Promise.all([...o.invalidate, coreKeys.audit].map((queryKey) => qc.invalidateQueries({ queryKey })))
      if (o.successMessage) notify.success(typeof o.successMessage === 'function' ? o.successMessage(data) : o.successMessage)
    },
  })
}
