import { yupResolver } from '@hookform/resolvers/yup'
import { Button, Drawer, Form, Space, Table, Typography } from 'antd'
import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import * as yup from 'yup'
import { companiesApi, type CompanyInput } from '@/api/companies.api'
import { RHFDate, RHFFile, RHFInput, RHFYesNo } from '@/components/form'
import { buildPlanMatrix, planTypeLabel } from '@/domain/credit'
import { faDigits } from '@/lib/digits'
import { faString, isValidLegalId, requiredMsg } from '@/lib/validators'
import { qk, useApiMutation } from '@/queries'
import type { Company, PlanOption, Settings } from '@/types'

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
    agreementFile: yup
      .mixed<File>()
      .nullable()
      .test('size', 'حجم فایل حداکثر ۱۰ مگابایت', (f) => !f || f.size <= MAX_FILE),
    planKeys: yup
      .array(yup.string().required())
      .required()
      .min(1, 'حداقل یک طرح باید انتخاب شود')
      .max(maxPlans, `حداکثر ${maxPlans} طرح قابل انتخاب است`),
  })

type Values = yup.InferType<ReturnType<typeof makeSchema>>

const empty: Values = {
  name: '',
  nationalId: '',
  agreementNo: '',
  account: '',
  contractDate: '',
  openDate: '',
  sepah: false,
  agreementFile: null,
  planKeys: [],
}

interface Props {
  open: boolean
  company: Company | null
  settings: Settings
  onClose: () => void
}

export function CompanyFormDrawer({ open, company, settings, onClose }: Props) {
  const schema = useMemo(() => makeSchema(settings.maxPlans), [settings.maxPlans])
  const matrix = useMemo(() => buildPlanMatrix(settings), [settings])
  const { control, handleSubmit, reset, formState } = useForm<Values>({ resolver: yupResolver(schema), defaultValues: empty })

  useEffect(() => {
    if (!open) return
    reset(
      company
        ? {
            name: company.name,
            nationalId: company.nationalId,
            agreementNo: company.agreementNo,
            account: company.account,
            contractDate: company.contractDate,
            openDate: company.openDate,
            sepah: company.sepah,
            agreementFile: null,
            // فقط طرح‌هایی که هنوز در ماتریس فعلی وجود دارند
            planKeys: company.plans.map((p) => p.key).filter((k) => matrix.some((m) => m.key === k)),
          }
        : empty,
    )
  }, [open, company, matrix, reset])

  const save = useApiMutation(
    (input: CompanyInput) => (company ? companiesApi.update(company.id, input) : companiesApi.create(input)),
    {
      invalidate: [qk.companies],
      successMessage: (c) => (company ? `اطلاعات شرکت «${c?.name}» به‌روزرسانی شد.` : `شرکت «${c?.name}» ثبت شد.`),
    },
  )

  const onSubmit = (v: Values) => {
    const { agreementFile, ...rest } = v
    // در API واقعی: آپلود فایل با multipart/form-data و ارسال شناسه فایل
    save.mutate({ ...rest, agreementFile: agreementFile?.name }, { onSuccess: onClose })
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={920}
      title={company ? `ویرایش شرکت «${company.name}»` : 'ثبت اطلاعات شرکت'}
      destroyOnHidden
      extra={
        <Space>
          <Button onClick={onClose}>انصراف</Button>
          <Button type="primary" loading={save.isPending} onClick={handleSubmit(onSubmit)}>
            {company ? 'ذخیره تغییرات' : 'ثبت شرکت'}
          </Button>
        </Space>
      }
    >
      <Form layout="vertical" component={false}>
        <div className="form-grid">
          <RHFInput control={control} name="name" label="نام شرکت" required />
          <RHFInput control={control} name="nationalId" label="شناسه ملی شرکت" required inputProps={{ inputMode: 'numeric', maxLength: 11 }} />
          <RHFInput control={control} name="agreementNo" label="شماره تفاهم‌نامه" required />
          <RHFInput control={control} name="account" label="شماره حساب شرکت" required inputProps={{ inputMode: 'numeric' }} />
          <RHFDate control={control} name="contractDate" label="تاریخ انعقاد قرارداد" required />
          <RHFDate control={control} name="openDate" label="روز افتتاح حساب سپرده" required extra="روز ماهِ این تاریخ، روز مجاز انتقال اعتبار است." />
          <RHFYesNo control={control} name="sepah" label="دریافت حقوق پرسنل از بانک سپه؟" />
          <RHFFile control={control} name="agreementFile" label="فایل تفاهم‌نامه" accept=".pdf,.jpg,.jpeg,.png" currentName={company?.agreementFile} />
        </div>

        <Typography.Title level={5} style={{ marginTop: 8 }}>
          انتخاب طرح‌های مندرج در قرارداد
        </Typography.Title>
        <Controller
          control={control}
          name="planKeys"
          render={({ field }) => (
            <>
              <Typography.Text type="secondary">
                {faDigits(field.value.length)} از حداکثر {faDigits(settings.maxPlans)} طرح انتخاب شده
              </Typography.Text>
              <Table<PlanOption>
                style={{ marginTop: 8 }}
                size="small"
                rowKey="key"
                pagination={false}
                scroll={{ y: 360 }}
                dataSource={matrix}
                rowSelection={{
                  selectedRowKeys: field.value,
                  onChange: (keys) => field.onChange(keys as string[]),
                  hideSelectAll: true,
                  getCheckboxProps: (r) => ({
                    disabled: !field.value.includes(r.key) && field.value.length >= settings.maxPlans,
                  }),
                }}
                columns={[
                  { title: 'نوع تسهیلات', dataIndex: 'type', render: planTypeLabel },
                  { title: 'نرخ', dataIndex: 'rate', render: (v: number) => `${faDigits(v)}٪` },
                  { title: 'مدت بازپرداخت', dataIndex: 'term', render: (v: number) => `${faDigits(v)} ماه` },
                  { title: 'اعتبار به نسبت میانگین ماهانه', dataIndex: 'usable', render: (v: number) => `${faDigits(v)}٪` },
                ]}
              />
              {formState.errors.planKeys && (
                <div className="ant-form-item-explain-error">{formState.errors.planKeys.message}</div>
              )}
            </>
          )}
        />
      </Form>
    </Drawer>
  )
}
