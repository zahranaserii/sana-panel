import { Button, Form, Modal, Select, Space, Table } from 'antd'
import { useMemo, useState } from 'react'
import { requestsApi } from '@/api/requests.api'
import { Money, Section, StatusTag } from '@/components/common'
import { NO_GRANT_STAGE, POST_APPROVAL_STAGES, STATUS_META } from '@/domain/constants'
import { formatJalali } from '@/lib/jalali'
import { qk, useApiMutation, useCompanies, useRequests, useSettings } from '@/queries'
import { usePermissions } from '@/queries/auth'
import type { LoanRequest } from '@/types'
import { DecisionModal, type DecisionTarget } from './DecisionModal'

export default function CreditApprovalPage() {
  const { data: settings } = useSettings()
  const { data: companies = [] } = useCompanies()
  const { data: requests = [], isLoading } = useRequests(null, { all: true })
  const { can } = usePermissions()
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [selected, setSelected] = useState<string[]>([])
  const [target, setTarget] = useState<DecisionTarget | null>(null)
  const [noGrant, setNoGrant] = useState<{ req: LoanRequest; reason?: string } | null>(null)

  const companyName = useMemo(() => Object.fromEntries(companies.map((c) => [c.id, c.name])), [companies])
  const rows = requests
    .filter((r) => r.status !== 'PENDING_MANAGER' && r.status !== 'REJECTED_MANAGER')
    .filter((r) => companyFilter === 'all' || r.companyId === companyFilter)
    // اول درخواست‌های منتظر تصمیم، سپس جدیدترین‌ها
    .sort((a, b) => Number(b.status === 'PENDING_CREDIT') - Number(a.status === 'PENDING_CREDIT') || b.date.localeCompare(a.date))
  const selectedRows = rows.filter((r) => selected.includes(r.id) && r.status === 'PENDING_CREDIT')

  const stage = useApiMutation(
    (v: { id: string; stage: string; reason?: string }) => requestsApi.setPostStage(v.id, v.stage, v.reason),
    { invalidate: [qk.requestsRoot], successMessage: 'مرحله به‌روزرسانی شد.' },
  )

  const onStageChange = (r: LoanRequest, value: string) => {
    if (value === NO_GRANT_STAGE) setNoGrant({ req: r })
    else stage.mutate({ id: r.id, stage: value ?? '' })
  }

  return (
    <>
      <Section
        title="درخواست‌های ثبت‌شده"
        extra={
          <Space wrap>
            <Select
              style={{ minWidth: 180 }}
              value={companyFilter}
              onChange={setCompanyFilter}
              options={[{ value: 'all', label: 'همه شرکت‌ها' }, ...companies.map((c) => ({ value: c.id, label: c.name }))]}
            />
            {can('approve.approve') && (
              <Button type="primary" disabled={!selectedRows.length} onClick={() => setTarget({ action: 'approve', requests: selectedRows })}>
                تأیید گروهی
              </Button>
            )}
            {can('approve.reject') && (
              <Button danger disabled={!selectedRows.length} onClick={() => setTarget({ action: 'reject', requests: selectedRows })}>
                رد گروهی
              </Button>
            )}
          </Space>
        }
      >
        <Table<LoanRequest>
          rowKey="id"
          loading={isLoading}
          dataSource={rows}
          scroll={{ x: 1400 }}
          rowSelection={{
            selectedRowKeys: selected,
            onChange: (k) => setSelected(k as string[]),
            getCheckboxProps: (r) => ({ disabled: r.status !== 'PENDING_CREDIT' }),
          }}
          columns={[
            { title: 'شرکت', dataIndex: 'companyId', render: (id) => companyName[id] ?? '—' },
            { title: 'پرسنل', dataIndex: 'staffName' },
            { title: 'طرح', dataIndex: 'planLabel' },
            { title: 'مبلغ', dataIndex: 'amount', render: (a) => <Money value={a} />, sorter: (a, b) => a.amount - b.amount },
            { title: 'تاریخ ثبت', dataIndex: 'date', render: (d) => formatJalali(d) },
            { title: 'تاریخ تأیید/رد', dataIndex: 'decidedAt', render: (d) => formatJalali(d) },
            {
              title: 'توضیحات',
              render: (_, r) => [r.rejectReason, r.noGrantReason, r.note].filter(Boolean).join(' — ') || '—',
            },
            { title: 'مستندات', dataIndex: 'fileName', render: (f) => f || '—' },
            {
              title: 'وضعیت',
              dataIndex: 'status',
              render: (s) => <StatusTag status={s} />,
              filters: (['PENDING_CREDIT', 'APPROVED', 'REJECTED'] as const).map((s) => ({ text: STATUS_META[s].label, value: s })),
              onFilter: (v, r) => r.status === v,
            },
            {
              title: 'مرحله پس از تأیید',
              width: 220,
              render: (_, r) =>
                r.status === 'APPROVED' ? (
                  <Select
                    size="small"
                    style={{ width: 200 }}
                    placeholder="— انتخاب کنید —"
                    allowClear
                    disabled={!can('approve.stage')}
                    value={r.postStage || undefined}
                    onChange={(v) => onStageChange(r, v)}
                    options={POST_APPROVAL_STAGES.map((s) => ({ value: s, label: s }))}
                  />
                ) : '—',
            },
            {
              title: 'عملیات',
              fixed: 'left',
              render: (_, r) =>
                r.status === 'PENDING_CREDIT' ? (
                  <Space size={4}>
                    {can('approve.approve') && (
                      <Button size="small" type="primary" onClick={() => setTarget({ action: 'approve', requests: [r] })}>تأیید</Button>
                    )}
                    {can('approve.reject') && (
                      <Button size="small" danger onClick={() => setTarget({ action: 'reject', requests: [r] })}>رد</Button>
                    )}
                  </Space>
                ) : '—',
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

      {/* جایگزین prompt() نسخه HTML */}
      <Modal
        open={!!noGrant}
        title="علت عدم اعطای تسهیلات غیرحضوری"
        okText="ثبت"
        okButtonProps={{ disabled: !noGrant?.reason, loading: stage.isPending }}
        onCancel={() => setNoGrant(null)}
        onOk={() =>
          stage.mutate({ id: noGrant!.req.id, stage: NO_GRANT_STAGE, reason: noGrant!.reason }, { onSuccess: () => setNoGrant(null) })
        }
        destroyOnHidden
      >
        <Form layout="vertical">
          <Form.Item label="علت" required>
            <Select
              placeholder="— انتخاب کنید —"
              value={noGrant?.reason}
              onChange={(reason) => setNoGrant((s) => (s ? { ...s, reason } : s))}
              options={(settings?.noGrantReasons ?? []).map((r) => ({ value: r, label: r }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
