import { yupResolver } from '@hookform/resolvers/yup'
import { App, Button, Form, InputNumber, Radio, Select, Table, Typography } from 'antd'
import { useEffect, useMemo } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import * as yup from 'yup'
import { requestsApi, type NewRequestItem } from '@/api/requests.api'
import { AmountInput } from '@/components/AmountInput'
import { Money } from '@/components/common'
import { isConsuming } from '@/domain/constants'
import { planLabel } from '@/domain/credit'
import { faDigits } from '@/lib/digits'
import { jMonthKey } from '@/lib/jalali'
import { fmt, rialText, tomanWords } from '@/lib/money'
import { qk, useApiMutation } from '@/queries'
import type { Company, ISODate, LoanRequest, Staff } from '@/types'
import { StaffFilters } from '../staff/StaffFilters'
import { useStaffFilter } from '../staff/useStaffFilter'

type Mode = 'fixed' | 'variable'
interface Ctx {
  availableByPlan: Record<string, number>
}

function totalOf(v: { mode?: Mode; selected?: string[]; fixedAmount?: number | null; amounts?: Record<string, number | null> }) {
  const sel = v.selected ?? []
  return v.mode === 'variable'
    ? sel.reduce((s, id) => s + (v.amounts?.[id] ?? 0), 0)
    : (v.fixedAmount ?? 0) * sel.length
}

const schema = yup
  .object({
    planKey: yup.string().required('طرح را انتخاب کنید'),
    mode: yup.mixed<Mode>().oneOf(['fixed', 'variable']).required(),
    selected: yup.array(yup.string().required()).required().min(1, 'حداقل یک پرسنل را از جدول انتخاب کنید'),
    fixedAmount: yup
      .number()
      .nullable()
      .when('mode', {
        is: 'fixed',
        then: (s) => s.required('مبلغ وام را وارد کنید').min(1, 'مبلغ باید بیشتر از صفر باشد'),
      }),
    orders: yup.mixed<Record<string, number | null>>().required(),
    amounts: yup.mixed<Record<string, number | null>>().required(),
  })
  .test('amounts-and-limit', '', function (v) {
    if (v.mode === 'variable' && v.selected?.some((id) => !(v.amounts?.[id] && v.amounts[id]! > 0)))
      return this.createError({ path: 'amounts', message: 'برای همه پرسنل انتخاب‌شده، مبلغ وام را وارد کنید.' })
    const available = (this.options.context as Ctx | undefined)?.availableByPlan[v.planKey] ?? 0
    const total = totalOf(v)
    if (total > available)
      return this.createError({
        path: 'selected',
        message: `مجموع مبلغ (${rialText(total)}) بیشتر از اعتبار باقی‌مانده این طرح (${rialText(available)}) است.`,
      })
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
  const { modal } = App.useApp()
  const filter = useStaffFilter(staff)
  const defaults: Values = {
    planKey: company.plans[0]?.key ?? '',
    mode: 'fixed',
    selected: [],
    fixedAmount: null,
    orders: {},
    amounts: {},
  }
  const { control, handleSubmit, reset, formState } = useForm<Values>({
    resolver: yupResolver(schema),
    context: { availableByPlan },
    defaultValues: defaults,
  })
  useEffect(() => reset(defaults), [company.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const v = useWatch({ control }) as Values
  const available = availableByPlan[v.planKey] ?? 0
  const total = totalOf(v)
  const defaultOrder = useMemo(
    () => Object.fromEntries([...staff].sort((a, b) => a.priority - b.priority).map((s, i) => [s.id, i + 1])),
    [staff],
  )

  const create = useApiMutation(
    (x: { planKey: string; items: NewRequestItem[] }) => requestsApi.create(company.id, x.planKey, x.items, baseDate),
    { invalidate: [qk.requestsRoot], successMessage: (r) => `درخواست وام برای ${faDigits(r.length)} نفر ثبت شد.` },
  )

  const onSubmit = (values: Values) => {
    const items: NewRequestItem[] = values.selected.map((id) => ({
      staffId: id,
      amount: values.mode === 'variable' ? values.amounts[id] ?? 0 : values.fixedAmount ?? 0,
      paymentOrder: values.orders[id] ?? defaultOrder[id] ?? 999,
    }))
    const submit = () => create.mutateAsync({ planKey: values.planKey, items }).then(() => reset(defaults))

    // هشدار تخصیص مجدد در همان ماه
    const month = jMonthKey(baseDate)
    const dups = values.selected
      .map((id) => requests.find((r) => r.staffId === id && isConsuming(r.status) && jMonthKey(r.date) === month))
      .filter((r): r is LoanRequest => !!r)
    if (!dups.length) return void submit()
    modal.confirm({
      title: 'هشدار تخصیص مجدد در همین ماه',
      width: 560,
      content: (
        <ul style={{ paddingInlineStart: 18 }}>
          {dups.map((r) => (
            <li key={r.id}>
              {r.staffName}: قبلاً {rialText(r.amount)} ({r.planLabel}) در این ماه تخصیص داده شده
            </li>
          ))}
        </ul>
      ),
      okText: 'بله، ثبت شود',
      onOk: submit,
    })
  }

  const fixedPerPerson = v.fixedAmount ?? 0
  const maxCount = fixedPerPerson ? Math.floor(available / fixedPerPerson) : 0
  const over = total > available

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Form layout="vertical" component={false} disabled={!canAllocate || !canSubmit}>
        <div style={{ maxWidth: 480 }}>
          <div className="field-label">طرح این ماه (طبق تفاهم‌نامه)</div>
          <Controller
            control={control}
            name="planKey"
            render={({ field }) => (
              <Select
                {...field}
                style={{ width: '100%' }}
                options={company.plans.map((p) => ({ value: p.key, label: planLabel(p) }))}
                disabled={company.plans.length <= 1 || !canAllocate}
              />
            )}
          />
        </div>

        <Typography.Title level={5} style={{ marginTop: 18 }}>
          انتخاب پرسنل {v.selected?.length ? <span className="hint">({faDigits(v.selected.length)} نفر انتخاب‌شده)</span> : null}
        </Typography.Title>
        <StaffFilters f={filter} />

        <Controller
          control={control}
          name="mode"
          render={({ field }) => (
            <Radio.Group
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              style={{ marginBottom: 10 }}
              options={[
                { value: 'fixed', label: 'مبلغ یکسان برای همه' },
                { value: 'variable', label: 'مبلغ متفاوت برای هرکس' },
              ]}
            />
          )}
        />
        <div className="hint">
          فهرست بر اساس اولویت پرسنل مرتب شده؛ ستون «ترتیب پرداخت» را می‌توانید برای همین تخصیص تغییر دهید.
        </div>

        <Controller
          control={control}
          name="selected"
          render={({ field, fieldState }) => (
            <>
              <Table<Staff>
                size="small"
                rowKey="id"
                dataSource={filter.rows}
                pagination={false}
                scroll={{ y: 300, x: 600 }}
                locale={{ emptyText: 'پرسنلی با این شرایط یافت نشد.' }}
                rowSelection={{
                  selectedRowKeys: field.value,
                  onChange: (keys) => field.onChange(keys as string[]),
                  getCheckboxProps: () => ({ disabled: !canAllocate || !canSubmit }),
                  preserveSelectedRowKeys: true,
                }}
                columns={[
                  { title: 'اولویت', dataIndex: 'priority', width: 70, render: (p) => <b>{faDigits(p)}</b> },
                  { title: 'نام', dataIndex: 'fullName' },
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
                          />
                        )}
                      />
                    ),
                  },
                  ...(v.mode === 'variable'
                    ? [
                        {
                          title: 'مبلغ وام این فرد',
                          width: 220,
                          render: (_: unknown, s: Staff) => (
                            <Controller
                              control={control}
                              name="amounts"
                              render={({ field: af }) => (
                                <AmountInput
                                  value={af.value[s.id] ?? null}
                                  onChange={(n) => af.onChange({ ...af.value, [s.id]: n })}
                                  disabled={!field.value.includes(s.id) || !canAllocate}
                                />
                              )}
                            />
                          ),
                        },
                      ]
                    : []),
                ]}
              />
              {fieldState.error && <div className="ant-form-item-explain-error">{fieldState.error.message}</div>}
            </>
          )}
        />
        {formState.errors.amounts && (
          <div className="ant-form-item-explain-error">{(formState.errors.amounts as { message?: string }).message}</div>
        )}

        {v.mode === 'fixed' && (
          <div style={{ maxWidth: 320, marginTop: 12 }}>
            <div className="field-label">مبلغ وام برای هر نفر</div>
            <Controller
              control={control}
              name="fixedAmount"
              render={({ field, fieldState }) => (
                <>
                  <AmountInput value={field.value} onChange={field.onChange} status={fieldState.error ? 'error' : ''} showWords />
                  {fieldState.error && <div className="ant-form-item-explain-error">{fieldState.error.message}</div>}
                </>
              )}
            />
          </div>
        )}

        <div className={`suggestion${over ? ' bad' : ''}`}>
          {!v.selected?.length && !fixedPerPerson && (
            <>اعتبار قابل استفاده این طرح در این ماه: <b><Money value={available} inline /></b> ({tomanWords(available)})</>
          )}
          {!v.selected?.length && v.mode === 'fixed' && !!fixedPerPerson && (
            <>با این مبلغ برای هر نفر، حداکثر به <b>{fmt(maxCount)} نفر</b> می‌توان وام داد. پرسنل را از جدول انتخاب کنید.</>
          )}
          {!!v.selected?.length && total === 0 && (
            <>{fmt(v.selected.length)} نفر انتخاب شده؛ مبلغ وام را وارد کنید. اعتبار قابل استفاده: <b><Money value={available} inline /></b></>
          )}
          {!!v.selected?.length && total > 0 && (
            <>
              مجموع مبلغ برای {fmt(v.selected.length)} نفر: <b>{rialText(total)}</b>
               ({tomanWords(total)}) — {over ? 'بیشتر از اعتبار باقی‌مانده است!' : 'مجاز است.'}
              {v.mode === 'fixed' && !!fixedPerPerson && <> حداکثر تا <b>{fmt(maxCount)} نفر</b> با این مبلغ قابل پوشش است.</>}
            </>
          )}
        </div>

        {!canAllocate && (
          <Typography.Text type="danger">
            تا رسیدن تاریخ و شرایط مجاز (طبق پیام‌های بالا)، امکان ثبت درخواست وجود ندارد.
          </Typography.Text>
        )}
        <div style={{ marginTop: 10 }}>
          <Button type="primary" htmlType="submit" size="large" loading={create.isPending} disabled={!canAllocate || !canSubmit}>
            ثبت درخواست برای پرسنل انتخاب‌شده
          </Button>
        </div>
      </Form>
    </form>
  )
}
