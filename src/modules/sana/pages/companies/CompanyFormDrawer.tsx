import { yupResolver } from '@hookform/resolvers/yup'
import { Table, Tag } from 'antd'
import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import * as yup from 'yup'
import { useApiMutation } from '@/core'
import { DateField, faString, FileField, FormDrawer, FormGrid, FormSection, isValidLegalId, requiredMsg, TextField, YesNoField } from '@/core/form'
import { faDigits } from '@/core/lib/digits'
import { companiesApi, type CompanyInput } from '../../api/companies.api'
import { buildPlanMatrix, planTypeLabel } from '../../domain/credit'
import { sanaKeys } from '../../queries'
import type { Company, PlanOption, Settings } from '../../types'

const MAX_FILE = 10 * 1024 * 1024

const makeSchema = (maxPlans: number) =>
  yup.object({
    name: faString().required(requiredMsg).max(150),
    nationalId: faString()
      .required(requiredMsg)
      .test('legal-id', 'شناسه ملی شرکت معتبر نیست (۱۱ رقم با رقم کنترل صحیح)', (v) => !v || isValidLegalId(v)),
    agreementNo: faString().required(requiredMsg).max(50),
    account: faString().required(requiredMsg).matches(/^[\d-]{5,30}$/, 'شماره حساب فقط شامل رقم و خط تیره است'),
    contractDate: yup.string().required('تاریخ انعقاد قرارداد را انتخاب کنید'),
    openDate: yup
      .string()
      .required('روز افتتاح حساب را انتخاب کنید')
      .test('after-contract', 'افتتاح حساب نمی‌تواند قبل از تاریخ قرارداد باشد', function (v) {
        const c = this.parent.contractDate as string | undefined
        return !v || !c || v >= c
      }),
    sepah: yup.boolean().required(),
    agreementFile: yup.mixed<File>().nullable().test('size', 'حجم فایل حداکثر ۱۰ مگابایت', (f) => !f || f.size <= MAX_FILE),
    planKeys: yup
      .array(yup.string().required())
      .required()
      .min(1, 'حداقل یک طرح باید انتخاب شود')
      .max(maxPlans, `حداکثر ${maxPlans} طرح قابل انتخاب است`),
  })
type Values = yup.InferType<ReturnType<typeof makeSchema>>

const empty: Values = { name: '', nationalId: '', agreementNo: '', account: '', contractDate: '', openDate: '', sepah: false, agreementFile: null, planKeys: [] }

export function CompanyFormDrawer({ open, company, settings, onClose }: { open: boolean; company: Company | null; settings: Settings; onClose: () => void }) {
  const matrix = useMemo(() => buildPlanMatrix(settings), [settings])
  const form = useForm<Values>({ resolver: yupResolver(makeSchema(settings.maxPlans)), defaultValues: empty })
  useEffect(() => {
    if (!open) return
    form.reset(
      company
        ? {
            ...company,
            agreementFile: null,
            // فقط طرح‌هایی که هنوز در ماتریس فعلی وجود دارند
            planKeys: company.plans.map((p) => p.key).filter((k) => matrix.some((m) => m.key === k)),
          }
        : empty,
    )
  }, [open, company, matrix, form])

  const save = useApiMutation((input: CompanyInput) => (company ? companiesApi.update(company.id, input) : companiesApi.create(input)), {
    invalidate: [sanaKeys.companies],
    successMessage: (c) => (company ? `اطلاعات «${c?.name}» به‌روزرسانی شد.` : `شرکت «${c?.name}» ثبت شد.`),
  })

  const c = form.control
  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      form={form}
      width={880}
      title={company ? `ویرایش «${company.name}»` : 'ثبت شرکت جدید'}
      submitText={company ? 'ذخیره تغییرات' : 'ثبت شرکت'}
      loading={save.isPending}
      // در API واقعی فایل با multipart آپلود و شناسه آن ارسال می‌شود
      onSubmit={({ agreementFile, ...rest }) => save.mutate({ ...rest, agreementFile: agreementFile?.name }, { onSuccess: onClose })}
    >
      <FormSection title="مشخصات شرکت">
        <FormGrid>
          <TextField control={c} name="name" label="نام شرکت" required />
          <TextField control={c} name="nationalId" label="شناسه ملی" required inputProps={{ inputMode: 'numeric', maxLength: 11, dir: 'ltr' }} />
          <TextField control={c} name="account" label="شماره حساب" required inputProps={{ inputMode: 'numeric', dir: 'ltr' }} />
          <YesNoField control={c} name="sepah" label="حقوق پرسنل از بانک سپه پرداخت می‌شود؟" />
        </FormGrid>
      </FormSection>
      <FormSection title="قرارداد">
        <FormGrid>
          <TextField control={c} name="agreementNo" label="شماره تفاهم‌نامه" required />
          <DateField control={c} name="contractDate" label="تاریخ انعقاد" required />
          <DateField control={c} name="openDate" label="افتتاح حساب سپرده" required extra="روزِ این تاریخ، روز مجاز انتقال اعتبار در هر ماه است." />
          <FileField control={c} name="agreementFile" label="فایل تفاهم‌نامه" accept=".pdf,.jpg,.jpeg,.png" currentName={company?.agreementFile} />
        </FormGrid>
      </FormSection>
      <Controller
        control={c}
        name="planKeys"
        render={({ field, fieldState }) => (
          <FormSection
            title={
              <>
                طرح‌های مندرج در قرارداد{' '}
                <Tag color={field.value.length ? 'gold' : 'default'} style={{ marginInlineStart: 6 }}>
                  {faDigits(field.value.length)} از {faDigits(settings.maxPlans)}
                </Tag>
              </>
            }
            description="سهم هر طرح از میانگین به‌صورت مساوی تقسیم می‌شود."
          >
            <Table<PlanOption>
              size="small"
              rowKey="key"
              pagination={false}
              scroll={{ y: 320 }}
              dataSource={matrix}
              onRow={(r) => ({
                onClick: () => {
                  const has = field.value.includes(r.key)
                  if (has) field.onChange(field.value.filter((k) => k !== r.key))
                  else if (field.value.length < settings.maxPlans) field.onChange([...field.value, r.key])
                },
                style: { cursor: 'pointer' },
              })}
              rowSelection={{
                selectedRowKeys: field.value,
                onChange: (keys) => field.onChange(keys as string[]),
                hideSelectAll: true,
                getCheckboxProps: (r) => ({ disabled: !field.value.includes(r.key) && field.value.length >= settings.maxPlans }),
              }}
              columns={[
                { title: 'نوع', dataIndex: 'type', render: (t) => <Tag color={t === 'QARZ' ? 'green' : 'blue'} variant="filled">{planTypeLabel(t)}</Tag> },
                { title: 'نرخ', dataIndex: 'rate', render: (v: number) => `${faDigits(v)}٪` },
                { title: 'مدت بازپرداخت', dataIndex: 'term', render: (v: number) => `${faDigits(v)} ماه` },
                { title: 'اعتبار نسبت به میانگین', dataIndex: 'usable', render: (v: number) => <b>{faDigits(v)}٪</b> },
              ]}
            />
            {fieldState.error && <div className="field-error">{fieldState.error.message}</div>}
          </FormSection>
        )}
      />
    </FormDrawer>
  )
}
