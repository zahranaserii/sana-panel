import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { Badge, Button, Tabs } from 'antd'
import { useState } from 'react'
import { usePermissions } from '@/core'
import { formatJalali } from '@/core/lib/jalali'
import { DataTable, Money, Page, SectionCard } from '@/core/ui'
import { CompanySelect, RequestStatusTag, useSelectedCompany } from '../../components'
import { useRequests, useSettings } from '../../queries'
import type { LoanRequest } from '../../types'
import { DecisionModal, type DecisionTarget } from './DecisionModal'

export default function ManagerApprovalPage() {
  const { data: settings } = useSettings()
  const { companyId } = useSelectedCompany()
  const { data: requests = [], isLoading } = useRequests(companyId)
  const { can } = usePermissions()
  const [target, setTarget] = useState<DecisionTarget | null>(null)

  const pending = requests.filter((r) => r.status === 'PENDING_MANAGER')
  const decided = requests.filter((r) => r.status !== 'PENDING_MANAGER').sort((a, b) => b.date.localeCompare(a.date))

  const base = [
    { title: 'پرسنل', dataIndex: 'staffName' },
    { title: 'طرح', dataIndex: 'planLabel' },
    { title: 'مبلغ', dataIndex: 'amount', render: (a: number) => <Money value={a} />, sorter: (a: LoanRequest, b: LoanRequest) => a.amount - b.amount },
    { title: 'تاریخ ثبت', dataIndex: 'date', render: (d: string) => formatJalali(d) },
  ]

  return (
    <Page actions={<CompanySelect />}>
      <Tabs
        items={[
          {
            key: 'pending',
            label: <span>در انتظار تصمیم <Badge count={pending.length} size="small" /></span>,
            children: (
              <SectionCard description="فقط درخواست‌هایی که اینجا تأیید شوند، برای بررسی به «تأیید اعتبارات» می‌روند.">
                <DataTable<LoanRequest>
                  rowKey="id"
                  loading={isLoading}
                  data={pending}
                  searchText={(r) => `${r.staffName} ${r.planLabel}`}
                  empty={{ title: 'درخواستی در انتظار تأیید نیست', description: 'همه درخواست‌ها بررسی شده‌اند.' }}
                  columns={base}
                  bulkActions={(rows, clear) => (
                    <>
                      {can('mgrApprove.approve') && (
                        <Button icon={<CheckOutlined />} onClick={() => setTarget({ action: 'mgrApprove', requests: rows, onDone: clear })}>
                          تأیید گروهی
                        </Button>
                      )}
                      {can('mgrApprove.reject') && (
                        <Button danger icon={<CloseOutlined />} onClick={() => setTarget({ action: 'mgrReject', requests: rows, onDone: clear })}>
                          رد گروهی
                        </Button>
                      )}
                    </>
                  )}
                  rowActions={(r) => [
                    { key: 'ok', label: 'تأیید', icon: <CheckOutlined />, primary: true, onClick: () => setTarget({ action: 'mgrApprove', requests: [r] }), hidden: !can('mgrApprove.approve') },
                    { key: 'no', label: 'رد', icon: <CloseOutlined />, danger: true, onClick: () => setTarget({ action: 'mgrReject', requests: [r] }), hidden: !can('mgrApprove.reject') },
                  ]}
                />
              </SectionCard>
            ),
          },
          {
            key: 'history',
            label: 'سوابق',
            children: (
              <SectionCard>
                <DataTable<LoanRequest>
                  rowKey="id"
                  data={decided}
                  searchText={(r) => `${r.staffName} ${r.planLabel}`}
                  columns={[...base, { title: 'وضعیت', dataIndex: 'status', render: (s) => <RequestStatusTag status={s} /> }]}
                />
              </SectionCard>
            ),
          },
        ]}
      />
      <DecisionModal target={target} rejectReasons={settings?.rejectReasons ?? []} onClose={() => setTarget(null)} />
    </Page>
  )
}
