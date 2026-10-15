import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { yupResolver } from '@hookform/resolvers/yup'
import { Alert, App, Button, Form, Input, InputNumber, Skeleton, Space } from 'antd'
import { useEffect } from 'react'
import {
  type Control,
  Controller,
  type FieldArrayPath,
  useFieldArray,
  useForm,
  useWatch,
} from 'react-hook-form'
import { useBlocker } from 'react-router-dom'
import { settingsApi } from '@/api/settings.api'
import { RHFNumber, RHFYesNo } from '@/components/form'
import { Section } from '@/components/common'
import { faDigits } from '@/lib/digits'
import { qk, useApiMutation, useSettings } from '@/queries'
import { usePermissions } from '@/queries/auth'
import type { Settings } from '@/types'
import { diffSettings, type FormShape, fromForm, settingsSchema, toForm } from './schema'

export default function SettingsPage() {
  const { data } = useSettings()
  if (!data) return <Skeleton active />
  return <SettingsForm settings={data} />
}

function SettingsForm({ settings }: { settings: Settings }) {
  const { modal } = App.useApp()
  const { can } = usePermissions()
  const editable = can('base.edit')
  const {
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { isDirty, errors },
  } = useForm<FormShape>({ resolver: yupResolver(settingsSchema), defaultValues: toForm(settings) })

  const save = useApiMutation((v: { next: Settings; changes: string[] }) => settingsApi.update(v.next, v.changes), {
    invalidate: [qk.settings],
    successMessage: 'تنظیمات پایه ذخیره شد.',
  })

  // ---- محافظت از تغییرات ذخیره‌نشده (جایگزین confirm دستی نسخه HTML) ----
  const blocker = useBlocker(({ currentLocation, nextLocation }) => isDirty && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    modal.confirm({
      title: 'تغییرات ذخیره‌نشده',
      content: 'تغییراتی در «اطلاعات پایه» ذخیره نشده است. اگر ادامه دهید این تغییرات از بین می‌رود.',
      okText: 'خروج بدون ذخیره',
      cancelText: 'ماندن',
      okButtonProps: { danger: true },
      onOk: () => blocker.proceed(),
      onCancel: () => blocker.reset(),
    })
  }, [blocker, modal])
  useEffect(() => {
    if (!isDirty) return
    const h = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [isDirty])

  const onSubmit = (values: FormShape) => {
    const next = fromForm(values)
    const changes = diffSettings(settings, next)
    if (!changes.length) return modal.info({ title: 'تغییری نسبت به مقادیر قبلی اعمال نشده است.' })
    modal.confirm({
      title: 'تغییرات زیر اعمال خواهد شد',
      width: 560,
      content: (
        <ul style={{ paddingInlineStart: 18, margin: 0 }}>
          {changes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      ),
      okText: 'تأیید و ذخیره',
      onOk: () => save.mutateAsync({ next, changes }).then((saved) => reset(toForm(saved))),
    })
  }

  // ---- مدیریت سطر/ستون ماتریس هم‌زمان با افزودن/حذف مدت و نرخ ----
  const murRates = useFieldArray({ control, name: 'murRates' })
  const terms = useFieldArray({ control, name: 'terms' })
  const sepahEnabled = useWatch({ control, name: 'sepahEnabled' })
  const qarzRate = useWatch({ control, name: 'qarzRate' })
  const rateValues = useWatch({ control, name: 'murRates' })
  const termValues = useWatch({ control, name: 'terms' })

  const addRate = () => {
    murRates.append({ value: 0 })
    setValue('usable', getValues('usable').map((row) => [...row, 0]), { shouldDirty: true })
  }
  const removeRate = (i: number) => {
    murRates.remove(i)
    setValue('usable', getValues('usable').map((row) => row.filter((_, ci) => ci !== i + 1)), { shouldDirty: true })
  }
  const addTerm = () => {
    terms.append({ value: 0 })
    setValue('usable', [...getValues('usable'), Array(getValues('murRates').length + 1).fill(0)], { shouldDirty: true })
  }
  const removeTerm = (i: number) => {
    terms.remove(i)
    setValue('usable', getValues('usable').filter((_, ti) => ti !== i), { shouldDirty: true })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Form layout="vertical" component={false} disabled={!editable}>
        <Section
          title="اطلاعات پایه طرح نگین میثاق"
          sub="این مقادیر مطابق دستورالعمل رسمی طرح تنظیم شده و همه محاسبات پنل از همین‌جا خوانده می‌شود. تغییر جدول درصدها روی طرح‌های شرکت‌های قبلاً ثبت‌شده اثر ندارد (تا زمان ویرایش شرکت)."
        >
          {!editable && <Alert type="info" showIcon title="شما فقط دسترسی مشاهده دارید." style={{ marginBottom: 16 }} />}
          <div className="form-grid">
            <RHFNumber control={control} name="qarzRate" label="نرخ تسهیلات قرض‌الحسنه (درصد)" inputProps={{ step: 0.1 }} />
            <RHFYesNo control={control} name="sepahEnabled" label="اعمال ضریب حقوق‌بگیر بانک سپه" />
            {sepahEnabled && (
              <RHFNumber control={control} name="multYes" label="ضریب تأثیر حقوق‌بگیر بانک سپه" inputProps={{ step: 0.01 }} />
            )}
            <RHFNumber control={control} name="years" label="مدت قرارداد (سال)" />
            <RHFNumber control={control} name="grace" label="مهلت استفاده از مانده پس از انقضا (ماه)" />
            <RHFNumber control={control} name="maxPlans" label="حداکثر تعداد طرح برای هر شرکت" />
            <RHFNumber control={control} name="delay" label="مهلت مجاز شدن معرفی پرسنل پس از قرارداد (ماه)" />
          </div>
        </Section>

        <Section title="نرخ‌ها و مدت‌ها">
          <div className="field-label">نرخ‌های مرابحه قابل انتخاب (درصد)</div>
          <Space wrap align="start">
            {murRates.fields.map((f, i) => (
              <Space.Compact key={f.id}>
                <Controller
                  control={control}
                  name={`murRates.${i}.value`}
                  render={({ field, fieldState }) => (
                    <InputNumber {...field} status={fieldState.error ? 'error' : ''} step={0.1} style={{ width: 110 }} prefix="٪" />
                  )}
                />
                <Button icon={<DeleteOutlined />} onClick={() => removeRate(i)} disabled={murRates.fields.length <= 1} />
              </Space.Compact>
            ))}
            <Button icon={<PlusOutlined />} onClick={addRate}>
              نرخ
            </Button>
          </Space>
          <ArrayError message={errors.murRates?.root?.message ?? errors.murRates?.message} />

          <div className="field-label" style={{ marginTop: 18 }}>مدت‌های بازپرداخت قابل انتخاب (ماه)</div>
          <Space wrap align="start">
            {terms.fields.map((f, i) => (
              <Space.Compact key={f.id}>
                <Controller
                  control={control}
                  name={`terms.${i}.value`}
                  render={({ field, fieldState }) => (
                    <InputNumber {...field} status={fieldState.error ? 'error' : ''} style={{ width: 110 }} suffix="ماه" />
                  )}
                />
                <Button icon={<DeleteOutlined />} onClick={() => removeTerm(i)} disabled={terms.fields.length <= 1} />
              </Space.Compact>
            ))}
            <Button icon={<PlusOutlined />} onClick={addTerm}>
              مدت
            </Button>
          </Space>
          <ArrayError message={errors.terms?.root?.message ?? errors.terms?.message} />
        </Section>

        <Section
          title="جدول درصد قابل استفاده از میانگین"
          sub="هر ردیف یک مدت بازپرداخت و هر ستون یک نرخ تسهیلات است؛ عدد هر خانه، درصد قابل استفاده از مجموع میانگین حساب برای آن ترکیب است."
        >
          <div style={{ overflowX: 'auto' }}>
            <table className="ant-table matrix-table plain-table">
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
                    <td>{faDigits(t?.value ?? 0)} ماهه</td>
                    {Array.from({ length: (rateValues?.length ?? 0) + 1 }, (_, ci) => (
                      <td key={ci}>
                        <Controller
                          control={control}
                          name={`usable.${ti}.${ci}`}
                          render={({ field, fieldState }) => (
                            <InputNumber
                              {...field}
                              value={field.value ?? null}
                              status={fieldState.error ? 'error' : ''}
                              step={0.1}
                              style={{ width: 76 }}
                              controls={false}
                            />
                          )}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="فهرست‌های کشویی">
          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            <TextList control={control} name="cancelReasons" title="دلایل لغو قرارداد" error={errors.cancelReasons?.root?.message ?? errors.cancelReasons?.message} />
            <TextList control={control} name="rejectReasons" title="دلایل رد درخواست وام" error={errors.rejectReasons?.root?.message ?? errors.rejectReasons?.message} />
            <TextList control={control} name="noGrantReasons" title="دلایل عدم اعطای تسهیلات غیرحضوری" error={errors.noGrantReasons?.root?.message ?? errors.noGrantReasons?.message} />
            <TextList control={control} name="avgDocTypes" title="انواع مستند میانگین موجودی" error={errors.avgDocTypes?.root?.message ?? errors.avgDocTypes?.message} />
          </div>
        </Section>
      </Form>

      {editable && (
        <Space>
          <Button type="primary" htmlType="submit" size="large" loading={save.isPending} disabled={!isDirty}>
            ذخیره تنظیمات پایه
          </Button>
          <Button size="large" onClick={() => reset()} disabled={!isDirty}>
            بازنشانی تغییرات
          </Button>
        </Space>
      )}
    </form>
  )
}

function ArrayError({ message }: { message?: string }) {
  return message ? <div className="ant-form-item-explain-error" style={{ marginTop: 6 }}>{message}</div> : null
}

type ListName = Extract<FieldArrayPath<FormShape>, 'cancelReasons' | 'rejectReasons' | 'noGrantReasons' | 'avgDocTypes'>

function TextList({ control, name, title, error }: { control: Control<FormShape>; name: ListName; title: string; error?: string }) {
  const { fields, append, remove } = useFieldArray({ control, name })
  return (
    <div>
      <div className="field-label" style={{ fontWeight: 700 }}>{title}</div>
      {fields.map((f, i) => (
        <Space.Compact key={f.id} style={{ width: '100%', marginBottom: 8 }}>
          <Controller
            control={control}
            name={`${name}.${i}.value`}
            render={({ field, fieldState }) => (
              <Input {...field} status={fieldState.error ? 'error' : ''} placeholder={fieldState.error?.message} />
            )}
          />
          <Button icon={<DeleteOutlined />} onClick={() => remove(i)} />
        </Space.Compact>
      ))}
      <Button size="small" icon={<PlusOutlined />} onClick={() => append({ value: '' })}>
        افزودن
      </Button>
      <ArrayError message={error} />
    </div>
  )
}
