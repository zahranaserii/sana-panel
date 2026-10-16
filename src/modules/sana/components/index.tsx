import { ShopOutlined } from '@ant-design/icons'
import { Select, Tag } from 'antd'
import { useEffect, useMemo } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { prefixedStorage } from '@/core/auth/session'
import { onConfigured } from '@/core/config'
import { createStatusBadge, EmptyState } from '@/core/ui'
import { faDigits } from '@/core/lib/digits'
import { STATUS_META } from '../domain/constants'
import { contractStatus, isActiveCompany } from '../domain/credit'
import { useCompanies } from '../queries'
import type { Company } from '../types'

export const RequestStatusTag = createStatusBadge(STATUS_META)

export function ContractStatusTag({ company }: { company: Company }) {
  const s = contractStatus(company)
  return (
    <Tag color={s.color} variant="filled" style={{ borderRadius: 999, fontWeight: 600 }}>
      {s.text}
    </Tag>
  )
}

/** شرکتِ انتخاب‌شده بین صفحات مشترک و ماندگار است */
const useSelectedStore = create<{ id: string | null; set: (id: string | null) => void }>()(
  persist((set) => ({ id: null, set: (id) => set({ id }) }), {
    name: 'sana-selected-company',
    storage: createJSONStorage(() => prefixedStorage(() => localStorage)),
    skipHydration: true,
  }),
)
onConfigured(() => void useSelectedStore.persist.rehydrate())

export function useSelectedCompany() {
  const { data: companies = [], isLoading } = useCompanies()
  const selectedId = useSelectedStore((s) => s.id)
  const setSelectedId = useSelectedStore((s) => s.set)
  const active = useMemo(() => companies.filter(isActiveCompany), [companies])
  const company = active.find((c) => c.id === selectedId) ?? null
  useEffect(() => {
    if (!isLoading && !company && active.length) setSelectedId(active[0].id)
  }, [isLoading, company, active, setSelectedId])
  return { company, companyId: company?.id ?? null, active, setSelectedId, isLoading }
}

/** انتخاب شرکت فعال (با جستجو) */
export function CompanySelect({ width = 320 }: { width?: number | string }) {
  const { companyId, active, setSelectedId, isLoading } = useSelectedCompany()
  return (
    <Select
      style={{ width, maxWidth: '100%' }}
      size="large"
      loading={isLoading}
      value={companyId ?? undefined}
      onChange={setSelectedId}
      placeholder="انتخاب شرکت"
      prefix={<ShopOutlined className="faint" />}
      showSearch={{ optionFilterProp: 'label' }}
      options={active.map((c) => ({ value: c.id, label: c.name, nid: c.nationalId }))}
      optionRender={(o) => (
        <div>
          <div>{o.label}</div>
          <div className="hint">شناسه ملی {faDigits(String(o.data.nid))}</div>
        </div>
      )}
      notFoundContent={<EmptyState title="شرکت فعالی وجود ندارد" />}
      aria-label="انتخاب شرکت"
    />
  )
}
