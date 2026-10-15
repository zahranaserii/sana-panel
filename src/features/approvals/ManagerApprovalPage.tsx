import { Button, Space, Table } from 'antd'
import { useState } from 'react'
import { CompanySelect, Money, Section, StatusTag, useSelectedCompany } from '@/components/common'
import { formatJalali } from '@/lib/jalali'
import { useRequests, useSettings } from '@/queries'
import { usePermissions } from '@/queries/auth'
import type { LoanRequest } from '@/types'
import { DecisionModal, type DecisionTarget } from './DecisionModal'

export default function ManagerApprovalPage() {
  const { data: settings } = useSettings()
  const { companyId } = useSelectedCompany()
  const { data: requests = [], isLoading } = useRequests(companyId)
  const { can } = usePermissions()
  const [selected, setSelected] = useState<string[]>([])
  const [target, setTarget] = useState<DecisionTarget | null>(null)

  const pending = requests.filter((r) => r.status === 'PENDING_MANAGER')
  const selectedRows = pending.filter((r) => selected.includes(r.id))

  return (
    <>
      <Section sub="فقط درخواست‌هایی که اینجا تأیید شوند، برای بررسی به مرحله «تأیید اعتبارات» می‌روند.">
        <CompanySelect />
      </Section>
      <Section
        title="درخواست‌های در انتظار تأیید مدیر شرکت"
        extra={
          <Space>
            {can('mgrApprove.approve') && (
              <Button type="primary" disabled={!selectedRows.length} onClick={() => setTarget({ action: 'mgrApprove', requests: selectedRows })}>
                تأیید گروهی
              </Button>
            )}
            {can('mgrApprove.reject') && (
              <Button danger disabled={!selectedRows.length} onClick={() => setTarget({ action: 'mgrReject', requests: selectedRows })}>
                رد گروهی
              </Button>
            )}
          </Space>
        }
      >
        <Table<LoanRequest>
          rowKey="id"
          loading={isLoading}
          dataSource={pending}
          scroll={{ x: 900 }}
          rowSelection={{ selectedRowKeys: selected, onChange: (k) => setSelected(k as string[]) }}
          locale={{ emptyText: 'درخواستی در انتظار تأیید مدیر شرکت نیست.' }}
          columns={[
            { title: 'پرسنل', dataIndex: 'staffName' },
            { title: 'طرح', dataIndex: 'planLabel' },
            { title: 'مبلغ', dataIndex: 'amount', render: (a) => <Money value={a} /> },
            { title: 'تاریخ ثبت', dataIndex: 'date', render: (d) => formatJalali(d) },
            { title: 'وضعیت', dataIndex: 'status', render: (s) => <StatusTag status={s} /> },
            {
              title: 'عملیات',
              render: (_, r) => (
                <Space size={4}>
                  {can('mgrApprove.approve') && (
                    <Button size="small" type="primary" onClick={() => setTarget({ action: 'mgrApprove', requests: [r] })}>تأیید</Button>
                  )}
                  {can('mgrApprove.reject') && (
                    <Button size="small" danger onClick={() => setTarget({ action: 'mgrReject', requests: [r] })}>رد</Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Section>
      <DecisionModal
        target={target}
        rejectReasons={settings?.rejectReasons ?? []}
        onClose={(done) => {
          setTarget(null)
          if (done) setSelected([])
        }}
      />
    </>
  )
}
