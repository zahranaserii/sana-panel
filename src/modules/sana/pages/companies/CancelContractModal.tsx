import { yupResolver } from '@hookform/resolvers/yup'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import { useApiMutation } from '@/core'
import { DateField, FileField, FormModal, SelectField, TextAreaField } from '@/core/form'
import { todayISO } from '@/core/lib/jalali'
import { Callout } from '@/core/ui'
import { companiesApi } from '../../api/companies.api'
import { sanaKeys } from '../../queries'
import type { Cancellation, Company } from '../../types'

const schema = yup.object({
  date: yup.string().required('تاریخ لغو الزامی است'),
  reason: yup.string().required('دلیل لغو را انتخاب کنید'),
  note: yup.string().max(500).default(''),
  file: yup.mixed<File>().nullable(),
})
type Values = yup.InferType<typeof schema>

export function CancelContractModal({ company, reasons, onClose }: { company: Company | null; reasons: string[]; onClose: () => void }) {
  const form = useForm<Values>({ resolver: yupResolver(schema) })
  useEffect(() => {
    if (company) form.reset({ date: todayISO(), reason: '', note: '', file: null })
  }, [company, form])

  const cancel = useApiMutation((v: { id: string; data: Cancellation }) => companiesApi.cancel(v.id, v.data), {
    invalidate: [sanaKeys.companies],
    successMessage: 'قرارداد لغو شد.',
  })

  return (
    <FormModal
      open={!!company}
      onClose={onClose}
      form={form}
      danger
      title="لغو قرارداد"
      submitText="ثبت لغو قرارداد"
      loading={cancel.isPending}
      intro={
        <Callout tone="danger" style={{ marginBottom: 16 }}>
          با لغو قرارداد «{company?.name}»، این شرکت از فهرست‌های فعال خارج می‌شود و امکان ثبت درخواست وام برای آن وجود ندارد.
        </Callout>
      }
      onSubmit={(v) =>
        cancel.mutate({ id: company!.id, data: { date: v.date, reason: v.reason, note: v.note ?? '', fileName: v.file?.name ?? '' } }, { onSuccess: onClose })
      }
    >
      <DateField control={form.control} name="date" label="تاریخ لغو" required />
      <SelectField
        control={form.control}
        name="reason"
        label="دلیل لغو"
        required
        options={reasons.map((r) => ({ value: r, label: r }))}
        selectProps={{ notFoundContent: 'ابتدا دلایل لغو را در اطلاعات پایه تعریف کنید' }}
      />
      <TextAreaField control={form.control} name="note" label="توضیحات" />
      <FileField control={form.control} name="file" label="الصاق فایل" />
    </FormModal>
  )
}
