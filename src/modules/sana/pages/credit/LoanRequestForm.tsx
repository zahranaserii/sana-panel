import { CheckCircleFilled, SendOutlined } from '@ant-design/icons'
import { yupResolver } from '@hookform/resolvers/yup'
import { Button, Grid, InputNumber, Progress, Segmented, Table } from 'antd'
import { useEffect, useMemo } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import * as yup from 'yup'
import { useApiMutation } from '@/core'
import { FormLayout } from '@/core/form'
import { faDigits } from '@/core/lib/digits'
import { jMonthKey } from '@/core/lib/jalali'
import { fmt, rialText, tomanWords } from '@/core/lib/money'
import { AmountInput, Avatar, Callout, confirm, InfoList, Money, SectionCard } from '@/core/ui'
import { type NewRequestItem, requestsApi } from '../../api/requests.api'
import { isConsuming } from '../../domain/constants'
import { planTypeLabel } from '../../domain/credit'
import { sanaKeys } from '../../queries'
import type { Company, ISODate, LoanRequest, Staff } from '../../types'
import { StaffFilters } from '../staff/StaffFilters'
import { useStaffFilter } from '../staff/useStaffFilter'
import './credit.css'

type Mode = 'fixed' | 'variable'
interface Ctx {
  availableByPlan: Record<string, number>
}

const totalOf = (v: { mode?: Mode; selected?: string[]; fixedAmount?: number | null; amounts?: Record<string, number | null> }) =>
  v.mode === 'variable' ? (v.selected ?? []).reduce((s, id) => s + (v.amounts?.[id] ?? 0), 0) : (v.fixedAmount ?? 0) * (v.selected?.length ?? 0)

const schema = yup
  .object({
    planKey: yup.string().required('طرح را انتخاب کنید'),
    mode: yup.mixed<Mode>().oneOf(['fixed', 'variable']).required(),
    selected: yup.array(yup.string().required()).required().min(1, 'حداقل یک پرسنل را از جدول انتخاب کنید'),
    fixedAmount: yup
      .number()
      .nullable()
      .when('mode', { is: 'fixed', then: (s) => s.required('مبلغ وام را وارد کنید').min(1, 'مبلغ باید بیشتر از صفر باشد') }),
    orders: yup.mixed<Record<string, number | null>>().required(),
    amounts: yup.mixed<Record<string, number | null>>().required(),
  })
  .test('amounts-and-limit', '', function (v) {
    if (v.mode === 'variable' && v.selected?.some((id) => !(v.amounts?.[id] && v.amounts[id]! > 0)))
      return this.createError({ path: 'amounts', message: 'برای همه پرسنل انتخاب‌شده، مبلغ وام را وارد کنید.' })
    const available = (this.options.context as Ctx | undefined)?.availableByPlan[v.planKey] ?? 0
    const total = totalOf(v)
    if (total > available)
      return this.createError({ path: 'selected', message: `مجموع مبلغ (${rialText(total)}) بیشتر از اعتبار باقی‌مانده این طرح است.` })
    return true
  })
type Values = yup.InferType<typeof schema>

interface Props {
  company: Company
  staff: Staff[]
  requests: LoanRequest[]
  availableByPlan: Record<string, number>
  baseDate: ISODate
  canAllocate: boolean
  canSubmit: boolean
}

export function LoanRequestForm({ company, staff, requests, availableByPlan, baseDate, canAllocate, canSubmit }: Props) {
  const screens = Grid.useBreakpoint()
  const filter = useStaffFilter(staff)
  const defaults = useMemo<Values>(
    () => ({ planKey: company.plans[0]?.key ?? '', mode: 'fixed', selected: [], fixedAmount: null, orders: {}, amounts: {} }),
    [company],
  )
  const { control, handleSubmit, reset, formState } = useForm<Values>({ resolver: yupResolver(schema), context: { availableByPlan }, defaultValues: defaults })
  useEffect(() => reset(defaults), [defaults, reset])

  const v = useWatch({ control }) as Values
  const available = availableByPlan[v.planKey] ?? 0
  const total = totalOf(v)
  const over = total > available
  const locked = !canAllocate || !canSubmit
  const defaultOrder = useMemo(() => Object.fromEntries([...staff].sort((a, b) => a.priority - b.priority).map((s, i) => [s.id, i + 1])), [staff])
  const month = jMonthKey(baseDate)
  const usedThisMonth = useMemo(
    () => new Set(requests.filter((r) => isConsuming(r.status) && jMonthKey(r.date) === month).map((r) => r.staffId)),
    [requests, month],
  )

  const create = useApiMutation(
    (x: { planKey: string; items: NewRequestItem[] }) => requestsApi.create(company.id, x.planKey, x.items, baseDate),
    { invalidate: [sanaKeys.requestsRoot], successMessage: (r) => `درخواست وام برای ${faDigits(r.length)} نفر ثبت شد و برای تأیید مدیر شرکت ارسال شد.` },
  )

  const onSubmit = async (values: Values) => {
    const items: NewRequestItem[] = values.selected.map((id) => ({
      staffId: id,
      amount: values.mode === 'variable' ? values.amounts[id] ?? 0 : values.fixedAmount ?? 0,
      paymentOrder: values.orders[id] ?? defaultOrder[id] ?? 999,
    }))
    const dups = values.selected
      .map((id) => requests.find((r) => r.staffId === id && isConsuming(r.status) && jMonthKey(r.date) === month))
      .filter((r): r is LoanRequest => !!r)
    if (
      dups.length &&
      !(await confirm({
        title: 'هشدار تخصیص مجدد در همین ماه',
        width: 560,
        okText: 'بله، ثبت شود',
        content: (
          <ul style={{ paddingInlineStart: 18 }}>
            {dups.map((r) => (
              <li key={r.id}>
                {r.staffName}: قبلاً {rialText(r.amount)} ({r.planLabel}) در این ماه تخصیص داده شده
              </li>
            ))}
          </ul>
        ),
      }))
    )
      return
    create.mutate({ planKey: values.planKey, items }, { onSuccess: () => reset(defaults) })
  }

  const percent = available ? Math.min(100, Math.round((total / available) * 100)) : 0
  const summary = (
    <SectionCard title="خلاصه درخواست" className="credit-summary">
      <InfoList
        min={120}
        items={[
          { label: 'پرسنل انتخاب‌شده', value: `${faDigits(v.selected?.length ?? 0)} نفر` },
          { label: 'مبلغ هر نفر', value: v.mode === 'fixed' ? (v.fixedAmount ? <Money value={v.fixedAmount} inline /> : '—') : 'متفاوت' },
        ]}
      />
      <div style={{ margin: '16px 0 6px' }} className="row-between">
        <span className="muted">مجموع</span>
        <b className="num" style={{ fontSize: 18, color: over ? 'var(--c-danger)' : 'var(--c-ink)' }}>{fmt(total)} ریال</b>
      </div>
      {total > 0 && <div className="hint" style={{ marginBottom: 8 }}>{tomanWords(total)}</div>}
      <Progress percent={percent} status={over ? 'exception' : 'normal'} strokeColor={over ? undefined : 'var(--c-accent)'} showInfo={false} />
      <div className="row-between hint">
        <span>اعتبار قابل استفاده: {fmt(available)}</span>
        <span>{over ? 'بیش از سقف!' : `باقی‌مانده: ${fmt(available - total)}`}</span>
      </div>
      {v.mode === 'fixed' && !!v.fixedAmount && (
        <Callout tone="neutral" style={{ marginTop: 12 }}>
          با این مبلغ حداکثر <b>{fmt(Math.floor(available / v.fixedAmount))} نفر</b> قابل پوشش است.
        </Callout>
      )}
      {formState.errors.selected && <div className="field-error">{formState.errors.selected.message}</div>}
      {formState.errors.amounts && <div className="field-error">{(formState.errors.amounts as { message?: string }).message}</div>}
      {formState.errors.fixedAmount && <div className="field-error">{formState.errors.fixedAmount.message}</div>}
      <Button type="primary" size="large" block icon={<SendOutlined />} style={{ marginTop: 16 }} htmlType="submit" loading={create.isPending} disabled={locked}>
        ثبت و ارسال برای تأیید
      </Button>
      {!canAllocate && <div className="hint" style={{ marginTop: 8, textAlign: 'center' }}>تا رسیدن شرایط مجاز، ثبت درخواست ممکن نیست.</div>}
    </SectionCard>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormLayout disabled={locked}>
        <div className="credit-layout">
          <div className="stack">
            <SectionCard step={1} title="انتخاب طرح" description="فقط طرح‌های مندرج در تفاهم‌نامه این شرکت قابل انتخاب است.">
              <Controller
                control={control}
                name="planKey"
                render={({ field }) => (
                  <div className="plan-cards" role="radiogroup" aria-label="طرح">
                    {company.plans.map((p) => {
                      const on = field.value === p.key
                      return (
                        <button
                          type="button"
                          role="radio"
                          aria-checked={on}
                          key={p.key}
                          disabled={locked}
                          className={`plan-card${on ? ' on' : ''}`}
                          onClick={() => field.onChange(p.key)}
                        >
                          {on && <CheckCircleFilled className="plan-card-check" />}
                          <span className="plan-card-type">{planTypeLabel(p.type)}</span>
                          <span className="plan-card-title">
                            {faDigits(p.rate)}٪ — {faDigits(p.term)} ماهه
                          </span>
                          <span className="hint">قابل استفاده</span>
                          <Money value={availableByPlan[p.key] ?? 0} inline strong />
                        </button>
                      )
                    })}
                  </div>
                )}
              />
            </SectionCard>

            <SectionCard
              step={2}
              title="انتخاب پرسنل"
              description="فهرست بر اساس اولویت مرتب شده؛ ترتیب پرداخت را می‌توانید برای همین تخصیص تغییر دهید."
              extra={
                <Controller
                  control={control}
                  name="mode"
                  render={({ field }) => (
                    <Segmented
                      value={field.value}
                      onChange={field.onChange}
                      disabled={locked}
                      options={[
                        { value: 'fixed', label: 'مبلغ یکسان' },
                        { value: 'variable', label: 'مبلغ متفاوت' },
                      ]}
                    />
                  )}
                />
              }
            >
              <StaffFilters f={filter} />
              <Controller
                control={control}
                name="selected"
                render={({ field }) => (
                  <Table<Staff>
                    size="small"
                    rowKey="id"
                    dataSource={filter.rows}
                    pagination={false}
                    scroll={{ y: 340, x: 'max-content' }}
                    locale={{ emptyText: 'پرسنلی با این شرایط یافت نشد.' }}
                    rowSelection={{
                      selectedRowKeys: field.value,
                      onChange: (keys) => field.onChange(keys as string[]),
                      getCheckboxProps: () => ({ disabled: locked }),
                      preserveSelectedRowKeys: true,
                    }}
                    columns={[
                      { title: 'اولویت', dataIndex: 'priority', width: 70, align: 'center', render: (p) => <b>{faDigits(p)}</b> },
                      {
                        title: 'نام',
                        dataIndex: 'fullName',
                        render: (n: string, s) => (
                          <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                            <Avatar name={n} size={26} />
                            {n}
                            {usedThisMonth.has(s.id) && <span className="tag-warn">این ماه وام گرفته</span>}
                          </span>
                        ),
                      },
                      { title: 'کد پرسنلی', dataIndex: 'personnelCode', render: faDigits },
                      {
                        title: 'ترتیب پرداخت',
                        width: 110,
                        render: (_, s) => (
                          <Controller
                            control={control}
                            name="orders"
                            render={({ field: of }) => (
                              <InputNumber
                                size="small"
                                min={1}
                                style={{ width: 70 }}
                                value={of.value[s.id] ?? defaultOrder[s.id]}
                                onChange={(n) => of.onChange({ ...of.value, [s.id]: n })}
                                aria-label={`ترتیب پرداخت ${s.fullName}`}
                              />
                            )}
                          />
                        ),
                      },
                      ...(v.mode === 'variable'
                        ? [
                            {
                              title: 'مبلغ وام',
                              width: 230,
                              render: (_: unknown, s: Staff) => (
                                <Controller
                                  control={control}
                                  name="amounts"
                                  render={({ field: af }) => (
                                    <AmountInput
                                      value={af.value[s.id] ?? null}
                                      onChange={(n) => af.onChange({ ...af.value, [s.id]: n })}
                                      disabled={!field.value.includes(s.id) || locked}
                                    />
                                  )}
                                />
                              ),
                            },
                          ]
                        : []),
                    ]}
                  />
                )}
              />
            </SectionCard>

            {v.mode === 'fixed' && (
              <SectionCard step={3} title="مبلغ وام هر نفر">
                <Controller
                  control={control}
                  name="fixedAmount"
                  render={({ field, fieldState }) => (
                    <div style={{ maxWidth: 360 }}>
                      <AmountInput value={field.value} onChange={field.onChange} status={fieldState.error ? 'error' : ''} showWords disabled={locked} />
                      {fieldState.error && <div className="field-error">{fieldState.error.message}</div>}
                    </div>
                  )}
                />
              </SectionCard>
            )}
          </div>
          <aside className="credit-aside" style={{ position: screens.lg ? 'sticky' : 'static' }}>
            {summary}
          </aside>
        </div>
      </FormLayout>
    </form>
  )
}
