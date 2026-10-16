import { FileTextOutlined, SaveOutlined } from '@ant-design/icons'
import { yupResolver } from '@hookform/resolvers/yup'
import { Button, Table } from 'antd'
import { useEffect, useMemo } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import * as yup from 'yup'
import { useApiMutation, usePermissions } from '@/core'
import { FileField, FormModal, SelectField, TextAreaField } from '@/core/form'
import { faDigits } from '@/core/lib/digits'
import { formatJalali } from '@/core/lib/jalali'
import { AmountInput, DataTable, EmptyState, Money, notify, SectionCard, StatCard, StatGrid, useDisclosure } from '@/core/ui'
import { type AveragesInput, companiesApi } from '../../api/companies.api'
import { CompanySelect, useSelectedCompany } from '../../components'
import { remainingAsOfMonth, sumAverages } from '../../domain/credit'
import { sanaKeys, useRequests } from '../../queries'
import type { AvgDoc, Settings } from '../../types'

type AvgValues = { averages: (number | null)[] }

const docSchema = yup.object({
  docType: yup.string().required('انتخاب نوع مستند اجباری است'),
  file: yup.mixed<File>().nullable().test('required', 'بارگذاری فایل مستند اجباری است', (f) => !!f),
  note: yup.string().max(500).default(''),
})
type DocValues = yup.InferType<typeof docSchema>

export function AveragesSection({ settings }: { settings: Settings }) {
  const { company } = useSelectedCompany()
  const { data: requests = [] } = useRequests(company?.id)
  const { can } = usePermissions()
  const editable = can('companies.avg')
  const docModal = useDisclosure()

  const { control, reset, formState } = useForm<AvgValues>({ defaultValues: { averages: Array(12).fill(null) } })
  useEffect(() => {
    reset({ averages: company ? [...company.monthlyAverages] : Array(12).fill(null) })
  }, [company, reset])
  const averages = useWatch({ control, name: 'averages' })
  // پیش‌نمایش زنده بر اساس مقادیر در حال ویرایش
  const preview = useMemo(() => (company ? { ...company, monthlyAverages: averages } : null), [company, averages])
  const filled = averages.filter((v) => v).length

  const docForm = useForm<DocValues>({ resolver: yupResolver(docSchema) })
  const save = useApiMutation((v: { id: string; input: AveragesInput }) => companiesApi.saveAverages(v.id, v.input), {
    invalidate: [sanaKeys.companies],
    successMessage: 'میانگین‌ها و مستند ثبت شد.',
  })

  const onSaveClick = () => {
    if (!company) return
    if (!formState.isDirty || averages.every((x, i) => (x ?? null) === (company.monthlyAverages[i] ?? null)))
      return void notify.info('تغییری در میانگین‌ها ایجاد نشده است.')
    docForm.reset({ docType: '', file: null, note: '' })
    docModal.open()
  }

  return (
    <div className="stack">
      <SectionCard
        title="میانگین موجودی حساب جاری"
        description="ماه‌های سال جاری قرارداد. مانده اعتبار هر ماه بر اساس وام‌های تخصیص‌یافته محاسبه می‌شود. ثبت هر تغییر نیازمند مستند است."
        extra={<CompanySelect />}
        footer={
          company &&
          editable && (
            <Button type="primary" icon={<SaveOutlined />} onClick={onSaveClick} disabled={!formState.isDirty}>
              ذخیره میانگین‌ها
            </Button>
          )
        }
      >
        {!company ? (
          <EmptyState title="شرکت فعالی انتخاب نشده است" />
        ) : (
          <>
            <StatGrid min={200}>
              <StatCard label="ماه‌های ثبت‌شده" value={`${faDigits(filled)} از ۱۲`} tone="info" />
              <StatCard label="مجموع میانگین" value={<Money value={preview ? sumAverages(preview) : 0} />} tone="accent" />
              <StatCard label="آخرین مستند" value={company.avgDocs.at(-1) ? formatJalali(company.avgDocs.at(-1)!.date) : '—'} tone="primary" />
            </StatGrid>
            <Table
              style={{ marginTop: 16 }}
              size="small"
              pagination={false}
              rowKey="i"
              dataSource={Array.from({ length: 12 }, (_, i) => ({ i }))}
              columns={[
                { title: 'ماه قرارداد', dataIndex: 'i', width: 110, render: (i: number) => <b>ماه {faDigits(i + 1)}</b> },
                {
                  title: 'میانگین موجودی',
                  dataIndex: 'i',
                  render: (i: number) => (
                    <Controller
                      control={control}
                      name={`averages.${i}`}
                      render={({ field }) => <AmountInput value={field.value} onChange={field.onChange} disabled={!editable} width={260} />}
                    />
                  ),
                },
                {
                  title: 'مانده اعتبار تا این ماه',
                  dataIndex: 'i',
                  render: (i: number) => (preview && averages[i] ? <Money value={remainingAsOfMonth(preview, requests, i, settings)} /> : <span className="faint">—</span>),
                },
              ]}
            />
          </>
        )}
      </SectionCard>

      {company && (
        <SectionCard title="مستندات ثبت‌شده" icon={<FileTextOutlined />}>
          <DataTable<AvgDoc>
            rowKey="id"
            data={[...company.avgDocs].reverse()}
            showCount={false}
            empty={{ title: 'هنوز مستندی ثبت نشده است' }}
            columns={[
              { title: 'تاریخ', dataIndex: 'date', render: (d) => formatJalali(d) },
              { title: 'ماه‌های تغییر یافته', dataIndex: 'months', render: (m: number[]) => m.map(faDigits).join('، ') },
              { title: 'نوع مستند', dataIndex: 'type' },
              { title: 'فایل', dataIndex: 'fileName' },
              { title: 'توضیحات', dataIndex: 'note', render: (n) => n || '—' },
              { title: 'ثبت‌کننده', dataIndex: 'user' },
            ]}
          />
        </SectionCard>
      )}

      <FormModal
        open={docModal.isOpen}
        onClose={docModal.close}
        form={docForm}
        title="مستند میانگین موجودی"
        submitText="ثبت میانگین و مستند"
        loading={save.isPending}
        intro={<p className="muted">برای ثبت میانگین‌ها، ارائه مستند الزامی است.</p>}
        onSubmit={(d) =>
          save.mutate(
            { id: company!.id, input: { monthlyAverages: averages.map((x) => x ?? null), docType: d.docType, fileName: d.file!.name, note: d.note ?? '' } },
            { onSuccess: docModal.close },
          )
        }
      >
        <SelectField control={docForm.control} name="docType" label="نوع مستند" required options={settings.avgDocTypes.map((t) => ({ value: t, label: t }))} />
        <FileField control={docForm.control} name="file" label="فایل مستند" required />
        <TextAreaField control={docForm.control} name="note" label="توضیحات" />
      </FormModal>
    </div>
  )
}
