import { BankOutlined, CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, EditOutlined, PlusOutlined, StopOutlined } from '@ant-design/icons'
import { Button, Segmented, Tabs } from 'antd'
import { useState } from 'react'
import { useApiMutation, usePermissions } from '@/core'
import { faDigits } from '@/core/lib/digits'
import { formatJalali } from '@/core/lib/jalali'
import { DataTable, Page, PageSkeleton, SectionCard, StatCard, StatGrid, useDisclosure } from '@/core/ui'
import { companiesApi } from '../../api/companies.api'
import { ContractStatusTag } from '../../components'
import { contractStatus } from '../../domain/credit'
import { sanaKeys, useCompanies, useSettings } from '../../queries'
import type { Company } from '../../types'
import { AveragesSection } from './AveragesSection'
import { CancelContractModal } from './CancelContractModal'
import { CompanyFormDrawer } from './CompanyFormDrawer'

type Filter = 'all' | 'active' | 'cancelled'

export default function CompaniesPage() {
  const { data: settings } = useSettings()
  const { data: companies = [], isLoading } = useCompanies()
  const { can } = usePermissions()
  const drawer = useDisclosure<Company>()
  const cancelModal = useDisclosure<Company>()
  const [filter, setFilter] = useState<Filter>('all')

  const remove = useApiMutation((id: string) => companiesApi.remove(id), { invalidate: [sanaKeys.companies], successMessage: 'شرکت حذف شد.' })

  if (!settings) return <PageSkeleton />
  const visible = companies.filter((c) => !c.deletedAt)
  const active = visible.filter((c) => contractStatus(c).active)
  const rows = visible.filter((c) => filter === 'all' || (filter === 'active') === contractStatus(c).active)

  return (
    <Page
      actions={
        can('companies.add') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => drawer.open()}>
            ثبت شرکت جدید
          </Button>
        )
      }
    >
      <StatGrid>
        <StatCard icon={<BankOutlined />} label="کل شرکت‌ها" value={faDigits(visible.length)} />
        <StatCard icon={<CheckCircleOutlined />} tone="success" label="قرارداد فعال" value={faDigits(active.length)} />
        <StatCard icon={<CloseCircleOutlined />} tone="danger" label="قرارداد لغوشده" value={faDigits(visible.length - active.length)} />
      </StatGrid>

      <Tabs
        items={[
          {
            key: 'list',
            label: 'فهرست شرکت‌ها',
            children: (
              <SectionCard>
                <DataTable<Company>
                  rowKey="id"
                  loading={isLoading}
                  data={rows}
                  searchText={(c) => `${c.name} ${c.nationalId} ${c.agreementNo}`}
                  searchPlaceholder="نام، شناسه ملی یا شماره تفاهم‌نامه…"
                  filters={
                    <Segmented<Filter>
                      value={filter}
                      onChange={setFilter}
                      options={[
                        { value: 'all', label: 'همه' },
                        { value: 'active', label: 'فعال' },
                        { value: 'cancelled', label: 'لغوشده' },
                      ]}
                    />
                  }
                  exportAs={{
                    filename: 'شرکت‌ها',
                    headers: ['نام شرکت', 'شناسه ملی', 'شماره تفاهم‌نامه', 'تاریخ قرارداد', 'تعداد طرح', 'وضعیت'],
                    row: (c) => [c.name, c.nationalId, c.agreementNo, formatJalali(c.contractDate, false), c.plans.length, contractStatus(c).text],
                  }}
                  empty={{
                    title: 'هنوز شرکتی ثبت نشده است',
                    action: can('companies.add') && <Button type="primary" icon={<PlusOutlined />} onClick={() => drawer.open()}>ثبت اولین شرکت</Button>,
                  }}
                  columns={[
                    {
                      title: 'شرکت',
                      sorter: (a, b) => a.name.localeCompare(b.name, 'fa'),
                      render: (_, c) => (
                        <div>
                          <div style={{ fontWeight: 700 }}>{c.name}</div>
                          <div className="hint num">شناسه ملی {faDigits(c.nationalId)}</div>
                        </div>
                      ),
                    },
                    { title: 'تفاهم‌نامه', dataIndex: 'agreementNo' },
                    { title: 'تاریخ قرارداد', dataIndex: 'contractDate', render: (d) => formatJalali(d), sorter: (a, b) => a.contractDate.localeCompare(b.contractDate) },
                    { title: 'طرح‌ها', render: (_, c) => faDigits(c.plans.length), align: 'center' },
                    { title: 'ثبت‌کننده', render: (_, c) => (c.registeredBy ? <span className="hint">{c.registeredBy.branchName}</span> : '—') },
                    { title: 'وضعیت', render: (_, c) => <ContractStatusTag company={c} /> },
                  ]}
                  rowActions={(c) => [
                    { key: 'edit', label: 'ویرایش', icon: <EditOutlined />, onClick: () => drawer.open(c), hidden: !can('companies.edit') },
                    { key: 'cancel', label: 'لغو قرارداد', icon: <StopOutlined />, onClick: () => cancelModal.open(c), hidden: !can('companies.cancel') || !!c.cancellation },
                    {
                      key: 'del',
                      label: 'حذف',
                      icon: <DeleteOutlined />,
                      danger: true,
                      confirm: `«${c.name}» حذف شود؟ اطلاعات برای گزارش‌گیری نگه داشته می‌شود.`,
                      onClick: () => remove.mutate(c.id),
                      hidden: !can('companies.delete'),
                    },
                  ]}
                />
              </SectionCard>
            ),
          },
          { key: 'avg', label: 'میانگین موجودی', children: <AveragesSection settings={settings} /> },
        ]}
      />

      <CompanyFormDrawer open={drawer.isOpen} company={drawer.data} settings={settings} onClose={drawer.close} />
      <CancelContractModal company={cancelModal.isOpen ? cancelModal.data : null} reasons={settings.cancelReasons} onClose={cancelModal.close} />
    </Page>
  )
}
