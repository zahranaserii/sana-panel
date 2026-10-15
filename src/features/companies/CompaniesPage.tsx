import { PlusOutlined } from '@ant-design/icons'
import { App, Button, Skeleton, Space, Table, Tag } from 'antd'
import { useState } from 'react'
import { companiesApi } from '@/api/companies.api'
import { Section } from '@/components/common'
import { contractStatus } from '@/domain/credit'
import { faDigits } from '@/lib/digits'
import { formatJalali } from '@/lib/jalali'
import { fmt } from '@/lib/money'
import { qk, useApiMutation, useCompanies, useSettings } from '@/queries'
import { usePermissions } from '@/queries/auth'
import type { Company } from '@/types'
import { AveragesSection } from './AveragesSection'
import { CancelContractModal } from './CancelContractModal'
import { CompanyFormDrawer } from './CompanyFormDrawer'

export default function CompaniesPage() {
  const { modal } = App.useApp()
  const { data: settings } = useSettings()
  const { data: companies = [], isLoading } = useCompanies()
  const { can } = usePermissions()
  const [drawer, setDrawer] = useState<{ open: boolean; company: Company | null }>({ open: false, company: null })
  const [cancelTarget, setCancelTarget] = useState<Company | null>(null)

  const remove = useApiMutation((id: string) => companiesApi.remove(id), {
    invalidate: [qk.companies],
    successMessage: 'شرکت حذف شد.',
  })

  if (!settings) return <Skeleton active />
  const visible = companies.filter((c) => !c.deletedAt)

  return (
    <>
      <Section
        title={
          <span>
            فهرست شرکت‌های ثبت‌شده{' '}
            <span className="hint">
              ({fmt(visible.filter((c) => !c.cancellation).length)} فعال از {fmt(companies.length)})
            </span>
          </span>
        }
        extra={
          can('companies.add') && (
            <Button icon={<PlusOutlined />} onClick={() => setDrawer({ open: true, company: null })}>
              ثبت شرکت جدید
            </Button>
          )
        }
      >
        <Table<Company>
          rowKey="id"
          loading={isLoading}
          dataSource={visible}
          scroll={{ x: 1000 }}
          columns={[
            { title: 'نام شرکت', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name, 'fa') },
            { title: 'شناسه ملی', dataIndex: 'nationalId', render: faDigits },
            { title: 'شماره تفاهم‌نامه', dataIndex: 'agreementNo' },
            { title: 'تاریخ قرارداد', dataIndex: 'contractDate', render: (d) => formatJalali(d), sorter: (a, b) => a.contractDate.localeCompare(b.contractDate) },
            { title: 'تعداد طرح', render: (_, c) => fmt(c.plans.length) },
            {
              title: 'ثبت‌کننده',
              render: (_, c) =>
                c.registeredBy ? (
                  <span className="hint">
                    {c.registeredBy.branchName} — {c.registeredBy.userName}
                  </span>
                ) : '—',
            },
            {
              title: 'وضعیت قرارداد',
              render: (_, c) => {
                const s = contractStatus(c)
                return <Tag color={s.color}>{s.text}</Tag>
              },
            },
            {
              title: 'عملیات',
              fixed: 'left',
              render: (_, c) => (
                <Space size={4} wrap>
                  {can('companies.edit') && (
                    <Button size="small" onClick={() => setDrawer({ open: true, company: c })}>
                      ویرایش
                    </Button>
                  )}
                  {can('companies.cancel') && !c.cancellation && (
                    <Button size="small" onClick={() => setCancelTarget(c)}>
                      لغو قرارداد
                    </Button>
                  )}
                  {can('companies.delete') && (
                    <Button
                      size="small"
                      danger
                      onClick={() =>
                        modal.confirm({
                          title: `حذف شرکت «${c.name}»؟`,
                          content: 'اطلاعات آن برای گزارش‌گیری نگه داشته می‌شود و در لیست‌های فعال نمایش داده نمی‌شود.',
                          okButtonProps: { danger: true },
                          okText: 'حذف',
                          onOk: () => remove.mutateAsync(c.id),
                        })
                      }
                    >
                      حذف
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Section>

      <AveragesSection settings={settings} />

      <CompanyFormDrawer
        open={drawer.open}
        company={drawer.company}
        settings={settings}
        onClose={() => setDrawer({ open: false, company: null })}
      />
      <CancelContractModal company={cancelTarget} reasons={settings.cancelReasons} onClose={() => setCancelTarget(null)} />
    </>
  )
}
