import { yupResolver } from '@hookform/resolvers/yup'
import { Form, Modal, Typography } from 'antd'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import { type DecisionAction, requestsApi } from '@/api/requests.api'
import { RHFFile, RHFSelect, RHFTextArea } from '@/components/form'
import { faDigits } from '@/lib/digits'
import { rialText, tomanWords } from '@/lib/money'
import { qk, useApiMutation } from '@/queries'
import type { LoanRequest } from '@/types'

export interface DecisionTarget {
  action: DecisionAction
  requests: LoanRequest[]
}

const isReject = (a?: DecisionAction) => a === 'reject' || a === 'mgrReject'

const schema = yup.object({
  reason: yup.string().when('$reject', { is: true, then: (s) => s.required('انتخاب دلیل رد اجباری است') }),
  note: yup.string().max(500).default(''),
  file: yup.mixed<File>().nullable(),
})
type Values = yup.InferType<typeof schema>

export function DecisionModal({
  target,
  rejectReasons,
  onClose,
}: {
  target: DecisionTarget | null
  rejectReasons: string[]
  onClose: (done: boolean) => void
}) {
  const reject = isReject(target?.action)
  const { control, handleSubmit, reset } = useForm<Values>({ resolver: yupResolver(schema), context: { reject } })
  useEffect(() => {
    if (target) reset({ reason: '', note: '', file: null })
  }, [target, reset])

  const decide = useApiMutation(
    (v: { ids: string[]; action: DecisionAction; reason?: string; note?: string; fileName?: string }) =>
      requestsApi.decide(v.ids, v.action, v),
    { invalidate: [qk.requestsRoot], successMessage: 'تصمیم ثبت شد.' },
  )

  const single = target?.requests.length === 1 ? target.requests[0] : null

  return (
    <Modal
      open={!!target}
      title={`${reject ? 'رد' : 'تأیید'} ${single ? 'درخواست' : 'گروهی درخواست‌ها'}`}
      okText="ثبت تصمیم"
      okButtonProps={{ danger: reject, loading: decide.isPending }}
      onCancel={() => onClose(false)}
      onOk={handleSubmit((v) =>
        decide.mutate(
          { ids: target!.requests.map((r) => r.id), action: target!.action, reason: v.reason, note: v.note, fileName: v.file?.name },
          { onSuccess: () => onClose(true) },
        ),
      )}
      destroyOnHidden
    >
      <Typography.Paragraph type="secondary">
        {single
          ? `${single.staffName} — ${single.planLabel} — ${rialText(single.amount)} (${tomanWords(single.amount)})`
          : `${faDigits(target?.requests.length ?? 0)} درخواست انتخاب‌شده — جمع ${rialText(target?.requests.reduce((s, r) => s + r.amount, 0) ?? 0)}`}
      </Typography.Paragraph>
      <Form layout="vertical" component={false}>
        {reject && (
          <RHFSelect
            control={control}
            name="reason"
            label="دلیل رد"
            required
            options={rejectReasons.map((r) => ({ value: r, label: r }))}
          />
        )}
        <RHFTextArea control={control} name="note" label="توضیحات (اختیاری)" />
        <RHFFile control={control} name="file" label="الصاق مستندات (اختیاری)" />
      </Form>
    </Modal>
  )
}
