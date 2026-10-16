import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { yupResolver } from '@hookform/resolvers/yup'
import { Badge, Button, Select, Tabs } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import { useApiMutation, usePermissions } from '@/core'
import { FormModal, SelectField } from '@/core/form'
import { formatJalali } from '@/core/lib/jalali'
import { DataTable, Money, Page, SectionCard, useDisclosure } from '@/core/ui'
import { requestsApi } from '../../api/requests.api'
import { RequestStatusTag } from '../../components'
import { NO_GRANT_STAGE, POST_APPROVAL_STAGES } from '../../domain/constants'
import { sanaKeys, useCompanies, useRequests, useSettings } from '../../queries'
import type { LoanRequest, RequestStatus } from '../../types'
import { DecisionModal, type DecisionTarget } from './DecisionModal'

type TabKey = 'PENDING_CREDIT' | 'APPROVED' | 'REJECTED' | 'all'
const VISIBLE: RequestStatus[] = ['PENDING_CREDIT', 'APPROVED', 'REJECTED']

export default function CreditApprovalPage() {
  const { data: settings } = useSettings()
  const { data: companies = [] } = useCompanies()
  const { data: requests = [], isLoading } = useRequests(null, { all: true })
  const { can } = usePermissions()
  const [tab, setTab] = useState<TabKey>('PENDING_CREDIT')
  const [companyId, setCompanyId] = useState<string>()
  const [target, setTarget] = useState<DecisionTarget | null>(null)
  const noGrant = useDisclosure<LoanRequest>()

  const companyName = useMemo(() => Object.fromEntries(companies.map((c) => [c.id, c.name])), [companies])
  const scoped = requests.filter((r) => VISIBLE.includes(r.status) && (!companyId || r.companyId === companyId))
  const count = (t: TabKey) => scoped.filter((r) => t === 'all' || r.status === t).length
  const rows = scoped.filter((r) => tab === 'all' || r.status === tab).sort((a, b) => b.date.localeCompare(a.date))

  const stage = useApiMutation((v: { id: string; stage: string; reason?: string }) => requestsApi.setPostStage(v.id, v.stage, v.reason), {
    invalidate: [sanaKeys.requestsRoot],
    successMessage: 'مرحله به‌روزرسانی شد.',
  })

  return (
    <Page
      actions={
        <Select
          allowClear
          size="large"
          placeholder="همه شرکت‌ها"
          style={{ minWidth: 240 }}
          value={companyId}
          onChange={setCompanyId}
          showSearch={{ optionFilterProp: 'label' }}
          options={companies.map((c) => ({ value: c.id, label: c.name }))}
        />
      }
    >
      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k as TabKey)}
        items={(
          [
            ['PENDING_CREDIT', 'در انتظار بررسی'],
            ['APPROVED', 'تأیید شده'],
            ['REJECTED', 'رد شده'],
            ['all', 'همه'],
          ] as [TabKey, string][]
        ).map(([key, label]) => ({
          key,
          label: (
            <span>
              {label} <Badge count={count(key)} size="small" color={key === 'PENDING_CREDIT' ? undefined : '#98A2B3'} overflowCount={999} />
            </span>
          ),
        }))}
      />
      <SectionCard>
        <DataTable<LoanRequest>
          key={tab}
          rowKey="id"
          loading={isLoading}
          data={rows}
          searchText={(r) => `${r.staffName} ${companyName[r.companyId]} ${r.planLabel}`}
          searchPlaceholder="نام پرسنل، شرکت یا طرح…"
          exportAs={{
            filename: 'درخواست‌های-وام',
            headers: ['شرکت', 'پرسنل', 'طرح', 'مبلغ (ریال)', 'تاریخ ثبت', 'وضعیت', 'مرحله', 'دلیل/توضیحات'],
            row: (r) => [companyName[r.companyId], r.staffName, r.planLabel, r.amount, formatJalali(r.date, false), r.status, r.postStage, [r.rejectReason, r.noGrantReason, r.note].filter(Boolean).join(' — ')],
          }}
          empty={{ title: tab === 'PENDING_CREDIT' ? 'درخواستی در انتظار بررسی نیست' : 'موردی وجود ندارد' }}
          selectable={(r) => r.status === 'PENDING_CREDIT'}
          bulkActions={
            tab === 'PENDING_CREDIT'
              ? (sel, clear) => (
                  <>
                    {can('approve.approve') && (
                      <Button icon={<CheckOutlined />} onClick={() => setTarget({ action: 'approve', requests: sel, onDone: clear })}>
                        تأیید گروهی
                      </Button>
                    )}
                    {can('approve.reject') && (
                      <Button danger icon={<CloseOutlined />} onClick={() => setTarget({ action: 'reject', requests: sel, onDone: clear })}>
                        رد گروهی
                      </Button>
                    )}
                  </>
                )
              : undefined
          }
          columns={[
            { title: 'شرکت', dataIndex: 'companyId', render: (id) => companyName[id] ?? '—' },
            { title: 'پرسنل', dataIndex: 'staffName', render: (n) => <b>{n}</b> },
            { title: 'طرح', dataIndex: 'planLabel' },
            { title: 'مبلغ', dataIndex: 'amount', render: (a) => <Money value={a} />, sorter: (a, b) => a.amount - b.amount },
            { title: 'تاریخ ثبت', dataIndex: 'date', render: (d) => formatJalali(d) },
            ...(tab !== 'PENDING_CREDIT' ? [{ title: 'وضعیت', dataIndex: 'status', render: (s: RequestStatus) => <RequestStatusTag status={s} /> }] : []),
            ...(tab === 'REJECTED' || tab === 'all'
              ? [{ title: 'دلیل / توضیحات', render: (_: unknown, r: LoanRequest) => [r.rejectReason, r.noGrantReason, r.note].filter(Boolean).join(' — ') || '—' }]
              : []),
            ...(tab === 'APPROVED'
              ? [
                  {
                    title: 'مرحله پس از تأیید',
                    width: 230,
                    render: (_: unknown, r: LoanRequest) => (
                      <div>
                        <Select
                          size="small"
                          style={{ width: 210 }}
                          placeholder="تعیین مرحله…"
                          allowClear
                          disabled={!can('approve.stage')}
                          value={r.postStage || undefined}
                          onChange={(v) => (v === NO_GRANT_STAGE ? noGrant.open(r) : stage.mutate({ id: r.id, stage: v ?? '' }))}
                          options={POST_APPROVAL_STAGES.map((s) => ({ value: s, label: s }))}
                          aria-label={`مرحله ${r.staffName}`}
                        />
                        {r.noGrantReason && <div className="hint">علت: {r.noGrantReason}</div>}
                      </div>
                    ),
                  },
                ]
              : []),
          ]}
          rowActions={
            tab === 'PENDING_CREDIT'
              ? (r) => [
                  { key: 'ok', label: 'تأیید', icon: <CheckOutlined />, primary: true, onClick: () => setTarget({ action: 'approve', requests: [r] }), hidden: !can('approve.approve') },
                  { key: 'no', label: 'رد', icon: <CloseOutlined />, danger: true, onClick: () => setTarget({ action: 'reject', requests: [r] }), hidden: !can('approve.reject') },
                ]
              : undefined
          }
        />
      </SectionCard>

      <DecisionModal target={target} rejectReasons={settings?.rejectReasons ?? []} onClose={() => setTarget(null)} />
      <NoGrantModal
        request={noGrant.isOpen ? noGrant.data : null}
        reasons={settings?.noGrantReasons ?? []}
        loading={stage.isPending}
        onClose={noGrant.close}
        onSubmit={(reason) => stage.mutate({ id: noGrant.data!.id, stage: NO_GRANT_STAGE, reason }, { onSuccess: noGrant.close })}
      />
    </Page>
  )
}

const noGrantSchema = yup.object({ reason: yup.string().required('علت را انتخاب کنید') })

/** جایگزین prompt() نسخه HTML */
function NoGrantModal({ request, reasons, loading, onClose, onSubmit }: { request: LoanRequest | null; reasons: string[]; loading: boolean; onClose: () => void; onSubmit: (reason: string) => void }) {
  const form = useForm<yup.InferType<typeof noGrantSchema>>({ resolver: yupResolver(noGrantSchema) })
  useEffect(() => {
    if (request) form.reset({ reason: '' })
  }, [request, form])
  return (
    <FormModal
      open={!!request}
      onClose={onClose}
      form={form}
      title="عدم اعطای تسهیلات غیرحضوری"
      intro={<p className="muted">{request?.staffName}</p>}
      loading={loading}
      onSubmit={(v) => onSubmit(v.reason)}
    >
      <SelectField control={form.control} name="reason" label="علت" required options={reasons.map((r) => ({ value: r, label: r }))} />
    </FormModal>
  )
}
