import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { yupResolver } from '@hookform/resolvers/yup'
import { Alert, Badge, Button, Input, InputNumber, Space, Tabs } from 'antd'
import { useEffect, useState } from 'react'
import { type Control, Controller, type FieldErrors, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useBlocker } from 'react-router-dom'
import { useApiMutation, usePermissions } from '@/core'
import { FormGrid, FormLayout, NumberField, YesNoField } from '@/core/form'
import { faDigits } from '@/core/lib/digits'
import { Callout, confirm, Page, PageSkeleton, SaveBar, SectionCard } from '@/core/ui'
import { settingsApi } from '../../api/settings.api'
import { sanaKeys, useSettings } from '../../queries'
import type { Settings } from '../../types'
import { diffSettings, type FormShape, fromForm, settingsSchema, toForm } from './schema'

export default function SettingsPage() {
  const { data } = useSettings()
  if (!data) return <PageSkeleton />
  return <SettingsForm settings={data} />
}

/** کدام فیلدها در کدام تب هستند (برای نشان‌دادن تعداد خطا روی تب) */
const TAB_FIELDS: Record<string, (keyof FormShape)[]> = {
  general: ['qarzRate', 'sepahEnabled', 'multYes', 'years', 'grace', 'maxPlans', 'delay'],
  rates: ['murRates', 'terms'],
  matrix: ['usable'],
  lists: ['cancelReasons', 'rejectReasons', 'noGrantReasons', 'avgDocTypes'],
}
const errCount = (errors: FieldErrors<FormShape>, tab: string) => TAB_FIELDS[tab].filter((f) => errors[f]).length

function SettingsForm({ settings }: { settings: Settings }) {
  const { can } = usePermissions()
  const editable = can('base.edit')
  const [tab, setTab] = useState('general')
  const { control, handleSubmit, reset, getValues, setValue, formState } = useForm<FormShape>({
    resolver: yupResolver(settingsSchema),
    defaultValues: toForm(settings),
  })
  const { isDirty, errors } = formState

  const save = useApiMutation((v: { next: Settings; changes: string[] }) => settingsApi.update(v.next, v.changes), {
    invalidate: [sanaKeys.settings],
    successMessage: 'تنظیمات پایه ذخیره شد.',
  })

  // ---- محافظت از تغییرات ذخیره‌نشده هنگام ترک صفحه ----
  const blocker = useBlocker(({ currentLocation, nextLocation }) => isDirty && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    confirm({ title: 'تغییرات ذخیره‌نشده', content: 'تغییرات «اطلاعات پایه» ذخیره نشده‌اند و از بین می‌روند.', okText: 'خروج بدون ذخیره', danger: true }).then(
      (ok) => (ok ? blocker.proceed() : blocker.reset()),
    )
  }, [blocker])
  useEffect(() => {
    if (!isDirty) return
    const h = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [isDirty])

  const onSubmit = handleSubmit(
    async (values) => {
      const next = fromForm(values)
      const changes = diffSettings(settings, next)
      if (!changes.length) return
      const ok = await confirm({
        title: `${faDigits(changes.length)} تغییر اعمال خواهد شد`,
        width: 560,
        okText: 'تأیید و ذخیره',
        content: (
          <ul style={{ paddingInlineStart: 18, margin: 0, lineHeight: 2 }}>
            {changes.map((c) => <li key={c}>{c}</li>)}
          </ul>
        ),
      })
      if (ok) save.mutate({ next, changes }, { onSuccess: (saved) => reset(toForm(saved)) })
    },
    // با خطا، به اولین تبی که خطا دارد برو
    (errs) => setTab(Object.keys(TAB_FIELDS).find((t) => errCount(errs, t)) ?? tab),
  )

  // ---- مدیریت سطر/ستون ماتریس هم‌زمان با افزودن/حذف مدت و نرخ ----
  const murRates = useFieldArray({ control, name: 'murRates' })
  const terms = useFieldArray({ control, name: 'terms' })
  const sepahEnabled = useWatch({ control, name: 'sepahEnabled' })
  const qarzRate = useWatch({ control, name: 'qarzRate' })
  const rateValues = useWatch({ control, name: 'murRates' })
  const termValues = useWatch({ control, name: 'terms' })
  const dirtyOpt = { shouldDirty: true }
  const addRate = () => {
    murRates.append({ value: 0 })
    setValue('usable', getValues('usable').map((row) => [...row, 0]), dirtyOpt)
  }
  const removeRate = (i: number) => {
    murRates.remove(i)
    setValue('usable', getValues('usable').map((row) => row.filter((_, ci) => ci !== i + 1)), dirtyOpt)
  }
  const addTerm = () => {
    terms.append({ value: 0 })
    setValue('usable', [...getValues('usable'), Array(getValues('murRates').length + 1).fill(0)], dirtyOpt)
  }
  const removeTerm = (i: number) => {
    terms.remove(i)
    setValue('usable', getValues('usable').filter((_, ti) => ti !== i), dirtyOpt)
  }

  const label = (text: string, key: string) => {
    const n = errCount(errors, key)
    return n ? <Badge count={n} size="small" offset={[-6, 0]}>{text}&nbsp;&nbsp;</Badge> : text
  }

  return (
    <Page>
      {!editable && <Alert type="info" showIcon title="شما فقط دسترسی مشاهده دارید." />}
      <form onSubmit={onSubmit} noValidate>
        <FormLayout disabled={!editable}>
          <Tabs
            activeKey={tab}
            onChange={setTab}
            items={[
              {
                key: 'general',
                label: label('عمومی', 'general'),
                children: (
                  <SectionCard title="پارامترهای طرح" description="مطابق دستورالعمل رسمی طرح نگین میثاق؛ همه محاسبات پنل از همین مقادیر خوانده می‌شود.">
                    <FormGrid min={260}>
                      <NumberField control={control} name="qarzRate" label="نرخ قرض‌الحسنه" inputProps={{ step: 0.1, suffix: 'درصد' }} />
                      <NumberField control={control} name="years" label="مدت قرارداد" inputProps={{ suffix: 'سال' }} />
                      <NumberField control={control} name="delay" label="مهلت مجاز شدن معرفی پرسنل" extra="پس از انعقاد قرارداد" inputProps={{ suffix: 'ماه' }} />
                      <NumberField control={control} name="grace" label="مهلت استفاده از مانده پس از انقضا" inputProps={{ suffix: 'ماه' }} />
                      <NumberField control={control} name="maxPlans" label="حداکثر تعداد طرح برای هر شرکت" />
                    </FormGrid>
                    <FormGrid min={260}>
                      <YesNoField control={control} name="sepahEnabled" label="اعمال ضریب حقوق‌بگیر بانک سپه" />
                      {sepahEnabled && <NumberField control={control} name="multYes" label="ضریب حقوق‌بگیر بانک سپه" inputProps={{ step: 0.01, prefix: '×' }} />}
                    </FormGrid>
                  </SectionCard>
                ),
              },
              {
                key: 'rates',
                label: label('نرخ‌ها و مدت‌ها', 'rates'),
                children: (
                  <div className="stack">
                    <SectionCard title="نرخ‌های مرابحه قابل انتخاب" description="هر نرخ یک ستون در جدول درصدها ایجاد می‌کند.">
                      <ChipList
                        fields={murRates.fields}
                        render={(i) => (
                          <Controller control={control} name={`murRates.${i}.value`} render={({ field, fieldState }) => (
                            <InputNumber {...field} status={fieldState.error ? 'error' : ''} step={0.1} style={{ width: 120 }} suffix="٪" aria-label={`نرخ ${i + 1}`} />
                          )} />
                        )}
                        onRemove={removeRate}
                        onAdd={addRate}
                        addLabel="افزودن نرخ"
                        error={errors.murRates?.root?.message ?? errors.murRates?.message}
                      />
                    </SectionCard>
                    <SectionCard title="مدت‌های بازپرداخت قابل انتخاب" description="هر مدت یک ردیف در جدول درصدها ایجاد می‌کند.">
                      <ChipList
                        fields={terms.fields}
                        render={(i) => (
                          <Controller control={control} name={`terms.${i}.value`} render={({ field, fieldState }) => (
                            <InputNumber {...field} status={fieldState.error ? 'error' : ''} style={{ width: 120 }} suffix="ماه" aria-label={`مدت ${i + 1}`} />
                          )} />
                        )}
                        onRemove={removeTerm}
                        onAdd={addTerm}
                        addLabel="افزودن مدت"
                        error={errors.terms?.root?.message ?? errors.terms?.message}
                      />
                    </SectionCard>
                  </div>
                ),
              },
              {
                key: 'matrix',
                label: label('جدول درصدها', 'matrix'),
                children: (
                  <SectionCard
                    title="درصد قابل استفاده از میانگین"
                    description="هر ردیف یک مدت بازپرداخت و هر ستون یک نرخ است؛ عدد هر خانه درصد قابل استفاده از مجموع میانگین حساب برای آن ترکیب است."
                  >
                    <Callout tone="accent" style={{ marginBottom: 14 }}>
                      تغییر این جدول روی طرح‌های شرکت‌های قبلاً ثبت‌شده اثر ندارد، مگر اینکه آن شرکت دوباره ویرایش شود.
                    </Callout>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="plain-table" style={{ textAlign: 'center' }}>
                        <thead>
                          <tr>
                            <th>مدت \ نرخ</th>
                            <th>قرض‌الحسنه ({faDigits(qarzRate ?? 0)}٪)</th>
                            {rateValues?.map((r, i) => <th key={i}>مرابحه {faDigits(r?.value ?? 0)}٪</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {termValues?.map((t, ti) => (
                            <tr key={ti}>
                              <td style={{ fontWeight: 700 }}>{faDigits(t?.value ?? 0)} ماهه</td>
                              {Array.from({ length: (rateValues?.length ?? 0) + 1 }, (_, ci) => (
                                <td key={ci}>
                                  <Controller control={control} name={`usable.${ti}.${ci}`} render={({ field, fieldState }) => (
                                    <InputNumber {...field} value={field.value ?? null} status={fieldState.error ? 'error' : ''} step={0.5} min={0} max={100} style={{ width: 80 }} controls={false} suffix="٪" aria-label={`مدت ${ti + 1} نرخ ${ci + 1}`} />
                                  )} />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>
                ),
              },
              {
                key: 'lists',
                label: label('فهرست‌های کشویی', 'lists'),
                children: (
                  <div className="grid-auto" style={{ ['--min' as string]: '320px' }}>
                    <TextList control={control} name="cancelReasons" title="دلایل لغو قرارداد" hint="هنگام لغو قرارداد شرکت" error={errors.cancelReasons?.root?.message ?? errors.cancelReasons?.message} />
                    <TextList control={control} name="rejectReasons" title="دلایل رد درخواست وام" hint="هنگام رد درخواست (اجباری)" error={errors.rejectReasons?.root?.message ?? errors.rejectReasons?.message} />
                    <TextList control={control} name="noGrantReasons" title="دلایل عدم اعطای غیرحضوری" hint="در مرحله پس از تأیید" error={errors.noGrantReasons?.root?.message ?? errors.noGrantReasons?.message} />
                    <TextList control={control} name="avgDocTypes" title="انواع مستند میانگین موجودی" hint="هنگام ثبت میانگین (اجباری)" error={errors.avgDocTypes?.root?.message ?? errors.avgDocTypes?.message} />
                  </div>
                ),
              },
            ]}
          />
        </FormLayout>
      </form>
      {editable && <SaveBar visible={isDirty} saving={save.isPending} onSave={onSubmit} onReset={() => reset()} />}
    </Page>
  )
}

function ChipList({
  fields,
  render,
  onRemove,
  onAdd,
  addLabel,
  error,
}: {
  fields: { id: string }[]
  render: (i: number) => React.ReactNode
  onRemove: (i: number) => void
  onAdd: () => void
  addLabel: string
  error?: string
}) {
  return (
    <>
      <Space wrap align="start">
        {fields.map((f, i) => (
          <Space.Compact key={f.id}>
            {render(i)}
            <Button icon={<DeleteOutlined />} onClick={() => onRemove(i)} disabled={fields.length <= 1} aria-label="حذف" />
          </Space.Compact>
        ))}
        <Button type="dashed" icon={<PlusOutlined />} onClick={onAdd}>
          {addLabel}
        </Button>
      </Space>
      {error && <div className="field-error">{error}</div>}
    </>
  )
}

type ListName = 'cancelReasons' | 'rejectReasons' | 'noGrantReasons' | 'avgDocTypes'

function TextList({ control, name, title, hint, error }: { control: Control<FormShape>; name: ListName; title: string; hint: string; error?: string }) {
  const { fields, append, remove } = useFieldArray({ control, name })
  return (
    <SectionCard title={title} description={hint}>
      <div className="stack" style={{ gap: 8 }}>
        {fields.map((f, i) => (
          <Space.Compact key={f.id} style={{ width: '100%' }}>
            <Controller control={control} name={`${name}.${i}.value`} render={({ field, fieldState }) => (
              <Input {...field} status={fieldState.error ? 'error' : ''} placeholder={fieldState.error?.message ?? 'متن گزینه'} aria-label={`${title} ${i + 1}`} />
            )} />
            <Button icon={<DeleteOutlined />} onClick={() => remove(i)} aria-label="حذف" />
          </Space.Compact>
        ))}
        <Button type="dashed" block icon={<PlusOutlined />} onClick={() => append({ value: '' })}>
          افزودن گزینه
        </Button>
        {error && <div className="field-error">{error}</div>}
      </div>
    </SectionCard>
  )
}
