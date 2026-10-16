import { yupResolver } from '@hookform/resolvers/yup'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import { useApiMutation } from '@/core'
import { FileField, FormModal, SelectField, TextAreaField } from '@/core/form'
import { faDigits } from '@/core/lib/digits'
import { rialText, tomanWords } from '@/core/lib/money'
import { Callout } from '@/core/ui'
import { type DecisionAction, requestsApi } from '../../api/requests.api'
import { sanaKeys } from '../../queries'
import type { LoanRequest } from '../../types'

export interface DecisionTarget {
  action: DecisionAction
  requests: LoanRequest[]
  /** پس از ثبت موفق (مثلاً پاک کردن انتخاب گروهی) */
  onDone?: () => void
}

const isReject = (a?: DecisionAction) => a === 'reject' || a === 'mgrReject'

const schema = yup.object({
  reason: yup.string().when('$reject', { is: true, then: (s) => s.required('انتخاب دلیل رد اجباری است') }),
  note: yup.string().max(500).default(''),
  file: yup.mixed<File>().nullable(),
})
type Values = yup.InferType<typeof schema>

/** تأیید/رد تکی یا گروهی درخواست‌ها (مشترک بین مدیر شرکت و اعتبارات) */
export function DecisionModal({ target, rejectReasons, onClose }: { target: DecisionTarget | null; rejectReasons: string[]; onClose: (done: boolean) => void }) {
  const reject = isReject(target?.action)
  const form = useForm<Values>({ resolver: yupResolver(schema), context: { reject } })
  useEffect(() => {
    if (target) form.reset({ reason: '', note: '', file: null })
  }, [target, form])

  const decide = useApiMutation(
    (v: { ids: string[]; action: DecisionAction; reason?: string; note?: string; fileName?: string }) => requestsApi.decide(v.ids, v.action, v),
    { invalidate: [sanaKeys.requestsRoot], successMessage: 'تصمیم ثبت شد.' },
  )

  const list = target?.requests ?? []
  const single = list.length === 1 ? list[0] : null
  const sum = list.reduce((s, r) => s + r.amount, 0)

  return (
    <FormModal
      open={!!target}
      onClose={() => onClose(false)}
      form={form}
      danger={reject}
      title={`${reject ? 'رد' : 'تأیید'} ${single ? 'درخواست' : `${faDigits(list.length)} درخواست`}`}
      submitText={reject ? 'ثبت رد' : 'ثبت تأیید'}
      loading={decide.isPending}
      intro={
        <Callout tone={reject ? 'danger' : 'success'} style={{ marginBottom: 16 }}>
          {single ? (
            <>
              <b>{single.staffName}</b> — {single.planLabel}
              <br />
              {rialText(single.amount)} ({tomanWords(single.amount)})
            </>
          ) : (
            <>
              {faDigits(list.length)} درخواست به جمع <b>{rialText(sum)}</b>
            </>
          )}
        </Callout>
      }
      onSubmit={(v) =>
        decide.mutate(
          { ids: list.map((r) => r.id), action: target!.action, reason: v.reason, note: v.note, fileName: v.file?.name },
          {
            onSuccess: () => {
              target!.onDone?.()
              onClose(true)
            },
          },
        )
      }
    >
      {reject && <SelectField control={form.control} name="reason" label="دلیل رد" required options={rejectReasons.map((r) => ({ value: r, label: r }))} />}
      <TextAreaField control={form.control} name="note" label="توضیحات" />
      <FileField control={form.control} name="file" label="الصاق مستندات" />
    </FormModal>
  )
}
