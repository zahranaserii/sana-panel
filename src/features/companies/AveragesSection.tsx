import { yupResolver } from '@hookform/resolvers/yup'
import { App, Button, Form, Modal, Table, Typography } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import * as yup from 'yup'
import { companiesApi, type AveragesInput } from '@/api/companies.api'
import { AmountInput } from '@/components/AmountInput'
import { CompanySelect, Money, Section, useSelectedCompany } from '@/components/common'
import { RHFFile, RHFSelect, RHFTextArea } from '@/components/form'
import { remainingAsOfMonth } from '@/domain/credit'
import { faDigits } from '@/lib/digits'
import { formatJalali } from '@/lib/jalali'
import { qk, useApiMutation, useRequests } from '@/queries'
import { usePermissions } from '@/queries/auth'
import type { AvgDoc, Settings } from '@/types'

type AvgValues = { averages: (number | null)[] }

const docSchema = yup.object({
  docType: yup.string().required('انتخاب نوع مستند اجباری است'),
  file: yup.mixed<File>().nullable().test('required', 'بارگذاری فایل مستند اجباری است', (f) => !!f),
  note: yup.string().max(500).default(''),
})
type DocValues = yup.InferType<typeof docSchema>

export function AveragesSection({ settings }: { settings: Settings }) {
  const { message } = App.useApp()
  const { company } = useSelectedCompany()
  const { data: requests = [] } = useRequests(company?.id)
  const { can } = usePermissions()
  const editable = can('companies.avg')
  const [docOpen, setDocOpen] = useState(false)

  const { control, reset, handleSubmit } = useForm<AvgValues>({ defaultValues: { averages: Array(12).fill(null) } })
  useEffect(() => {
    reset({ averages: company ? [...company.monthlyAverages] : Array(12).fill(null) })
  }, [company, reset])
  const averages = useWatch({ control, name: 'averages' })

  // پیش‌نمایش زنده مانده اعتبار بر اساس مقادیر در حال ویرایش
  const preview = useMemo(
    () => (company ? { ...company, monthlyAverages: averages } : null),
    [company, averages],
  )

  const docForm = useForm<DocValues>({ resolver: yupResolver(docSchema) })
  const save = useApiMutation((v: { id: string; input: AveragesInput }) => companiesApi.saveAverages(v.id, v.input), {
    invalidate: [qk.companies],
    successMessage: 'میانگین‌ها و مستند ثبت شد.',
  })

  const onSaveClick = handleSubmit((v) => {
    if (!company) return
    const changed = v.averages.some((x, i) => (x ?? null) !== (company.monthlyAverages[i] ?? null))
    if (!changed) return void message.info('تغییری در میانگین‌ها ایجاد نشده است.')
    docForm.reset({ docType: '', file: null, note: '' })
    setDocOpen(true)
  })

  const onConfirmDoc = docForm.handleSubmit((d) => {
    if (!company) return
    save.mutate(
      {
        id: company.id,
        input: { monthlyAverages: averages.map((x) => x ?? null), docType: d.docType, fileName: d.file!.name, note: d.note ?? '' },
      },
      { onSuccess: () => setDocOpen(false) },
    )
  })

  return (
    <Section
      title="میانگین موجودی حساب جاری — ماه‌های سال جاری قرارداد"
      sub="ستون اول را وارد کنید؛ ستون دوم (مانده اعتبار تا آن ماه) بر اساس وام‌های تخصیص‌یافته به‌صورت خودکار محاسبه می‌شود. ثبت هر تغییر نیازمند مستند است."
    >
      <CompanySelect style={{ marginBottom: 16 }} />
      {company && (
        <>
          <Table
            size="small"
            pagination={false}
            rowKey="i"
            dataSource={Array.from({ length: 12 }, (_, i) => ({ i }))}
            columns={[
              { title: 'ماه', dataIndex: 'i', width: 90, render: (i: number) => `ماه ${faDigits(i + 1)}` },
              {
                title: 'میانگین موجودی (ریال)',
                dataIndex: 'i',
                render: (i: number) => (
                  <Controller
                    control={control}
                    name={`averages.${i}`}
                    render={({ field }) => (
                      <AmountInput value={field.value} onChange={field.onChange} disabled={!editable} width={260} />
                    )}
                  />
                ),
              },
              {
                title: 'مانده اعتبار تا این ماه (محاسبه‌شده)',
                dataIndex: 'i',
                render: (i: number) =>
                  preview && averages[i] ? <Money value={remainingAsOfMonth(preview, requests, i, settings)} /> : '—',
              },
            ]}
          />
          {editable && (
            <Button type="primary" style={{ marginTop: 12 }} onClick={onSaveClick}>
              ذخیره میانگین‌ها
            </Button>
          )}

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            مستندات ثبت‌شده میانگین موجودی
          </Typography.Title>
          <Table<AvgDoc>
            size="small"
            rowKey="id"
            dataSource={[...company.avgDocs].reverse()}
            pagination={{ pageSize: 5 }}
            locale={{ emptyText: 'هنوز مستندی ثبت نشده است.' }}
            columns={[
              { title: 'تاریخ ثبت', dataIndex: 'date', render: (d) => formatJalali(d) },
              { title: 'ماه‌های ثبت/تغییر یافته', dataIndex: 'months', render: (m: number[]) => m.map(faDigits).join('، ') },
              { title: 'نوع مستند', dataIndex: 'type' },
              { title: 'فایل', dataIndex: 'fileName' },
              { title: 'توضیحات', dataIndex: 'note', render: (n) => n || '—' },
              { title: 'ثبت‌کننده', dataIndex: 'user' },
            ]}
          />
        </>
      )}

      <Modal
        open={docOpen}
        title="مستند میانگین موجودی"
        okText="ثبت میانگین و مستند"
        onOk={onConfirmDoc}
        onCancel={() => setDocOpen(false)}
        okButtonProps={{ loading: save.isPending }}
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary">برای ثبت میانگین، ارائه مستند الزامی است.</Typography.Paragraph>
        <Form layout="vertical" component={false}>
          <RHFSelect
            control={docForm.control}
            name="docType"
            label="نوع مستند"
            required
            options={settings.avgDocTypes.map((t) => ({ value: t, label: t }))}
          />
          <RHFFile control={docForm.control} name="file" label="فایل مستند" required />
          <RHFTextArea control={docForm.control} name="note" label="توضیحات (اختیاری)" />
        </Form>
      </Modal>
    </Section>
  )
}
