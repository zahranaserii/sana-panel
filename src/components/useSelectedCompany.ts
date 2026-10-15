import { useEffect, useMemo } from 'react'
import { isActiveCompany } from '@/domain/credit'
import { useCompanies } from '@/queries'
import { useUiStore } from '@/store/ui'

/** شرکت انتخاب‌شده (مشترک بین تب‌ها)؛ اگر نامعتبر باشد اولین شرکت فعال انتخاب می‌شود */
export function useSelectedCompany() {
  const { data: companies = [], isLoading } = useCompanies()
  const selectedId = useUiStore((s) => s.selectedCompanyId)
  const setSelectedId = useUiStore((s) => s.setSelectedCompanyId)
  const active = useMemo(() => companies.filter(isActiveCompany), [companies])
  const company = active.find((c) => c.id === selectedId) ?? null

  useEffect(() => {
    if (!isLoading && !company && active.length) setSelectedId(active[0].id)
  }, [isLoading, company, active, setSelectedId])

  return { company, companyId: company?.id ?? null, active, setSelectedId, isLoading }
}
