import { yupResolver } from '@hookform/resolvers/yup'
import { Form, Modal } from 'antd'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import { companiesApi } from '@/api/companies.api'
import { RHFDate, RHFFile, RHFSelect, RHFTextArea } from '@/components/form'
import { todayISO } from '@/lib/jalali'
import { qk, useApiMutation } from '@/queries'
import type { Cancellation, Company } from '@/types'

const schema = yup.object({
  date: yup.string().required('تاریخ لغو الزامی است'),
  reason: yup.string().required('دلیل لغو را انتخاب کنید'),
  note: yup.string().max(500).default(''),
  file: yup.mixed<File>().nullable(),
})
type Values = yup.InferType<typeof schema>

export function CancelContractModal({ company, reasons, onClose }: { company: Company | null; reasons: string[]; onClose: () => void }) {
  const { control, handleSubmit, reset } = useForm<Values>({ resolver: yupResolver(schema) })
  useEffect(() => {
    if (company) reset({ date: todayISO(), reason: '', note: '', file: null })
  }, [company, reset])

  const cancel = useApiMutation((v: { id: string; data: Cancellation }) => companiesApi.cancel(v.id, v.data), {
    invalidate: [qk.companies],
    successMessage: 'قرارداد لغو شد.',
  })

  return (
    <Modal
      open={!!company}
      title={`لغو قرارداد ${company?.name ?? ''}`}
      okText="ثبت لغو قرارداد"
      okButtonProps={{ danger: true, loading: cancel.isPending }}
      onCancel={onClose}
      onOk={handleSubmit((v) =>
        cancel.mutate(
          { id: company!.id, data: { date: v.date, reason: v.reason, note: v.note ?? '', fileName: v.file?.name ?? '' } },
          { onSuccess: onClose },
        ),
      )}
      destroyOnHidden
    >
      <Form layout="vertical" component={false}>
        <RHFDate control={control} name="date" label="تاریخ لغو" required />
        <RHFSelect
          control={control}
          name="reason"
          label="دلیل لغو"
          required
          options={reasons.map((r) => ({ value: r, label: r }))}
          selectProps={{ notFoundContent: 'ابتدا دلایل لغو را در اطلاعات پایه تعریف کنید' }}
        />
        <RHFTextArea control={control} name="note" label="توضیحات (اختیاری)" />
        <RHFFile control={control} name="file" label="الصاق فایل (اختیاری)" />
      </Form>
    </Modal>
  )
}
