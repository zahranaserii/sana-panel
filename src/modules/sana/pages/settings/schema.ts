import * as yup from 'yup'
import { requiredMsg } from '@/core/lib/validators'
import type { Settings } from '../../types'

const num = () => yup.number().typeError('یک عدد معتبر وارد کنید').required(requiredMsg)
const int = () => num().integer('عدد صحیح وارد کنید')

const uniqueBy =
  <T,>(pick: (x: T) => unknown) =>
  (list: T[] | undefined) => {
    const vals = (list ?? []).map(pick)
    return new Set(vals).size === vals.length
  }

const textList = (min: number) =>
  yup
    .array(yup.object({ value: yup.string().trim().required('متن را وارد کنید یا ردیف را حذف کنید') }))
    .required()
    .min(min, 'حداقل یک مورد لازم است')
    .test('unique', 'موارد تکراری مجاز نیست', uniqueBy((x) => x.value?.trim()))

export const settingsSchema = yup.object({
  qarzRate: num().min(0, 'حداقل ۰').max(100, 'حداکثر ۱۰۰'),
  sepahEnabled: yup.boolean().required(),
  multYes: num().min(1, 'ضریب باید حداقل ۱ باشد').max(5, 'حداکثر ۵'),
  years: int().min(1, 'حداقل ۱ سال'),
  grace: int().min(0, 'نمی‌تواند منفی باشد'),
  maxPlans: int()
    .min(1, 'حداقل ۱')
    .test('lte-matrix', 'بیشتر از تعداد کل ترکیب‌های طرح است', function (v) {
      const { murRates = [], terms = [] } = this.parent as { murRates?: unknown[]; terms?: unknown[] }
      return v === undefined || v <= (murRates.length + 1) * terms.length
    }),
  delay: int().min(0, 'نمی‌تواند منفی باشد'),
  murRates: yup
    .array(yup.object({ value: num().min(0).max(100, 'حداکثر ۱۰۰') }))
    .required()
    .min(1, 'حداقل یک نرخ مرابحه لازم است')
    .test('unique', 'نرخ تکراری مجاز نیست', uniqueBy((x) => x.value)),
  terms: yup
    .array(yup.object({ value: int().min(1, 'حداقل ۱ ماه').max(360) }))
    .required()
    .min(1, 'حداقل یک مدت لازم است')
    .test('unique', 'مدت تکراری مجاز نیست', uniqueBy((x) => x.value)),
  usable: yup.array(yup.array(num().min(0, '≥۰').max(100, '≤۱۰۰')).required()).required(),
  cancelReasons: textList(1),
  rejectReasons: textList(1),
  noGrantReasons: textList(1),
  avgDocTypes: textList(1),
})

export type FormShape = yup.InferType<typeof settingsSchema>

const wrap = <T,>(arr: T[]) => arr.map((value) => ({ value }))

export const toForm = (s: Settings): FormShape => ({
  ...s,
  murRates: wrap(s.murRates),
  terms: wrap(s.terms),
  cancelReasons: wrap(s.cancelReasons),
  rejectReasons: wrap(s.rejectReasons),
  noGrantReasons: wrap(s.noGrantReasons),
  avgDocTypes: wrap(s.avgDocTypes),
})

export const fromForm = (f: FormShape): Settings => ({
  ...f,
  murRates: f.murRates.map((x) => x.value),
  terms: f.terms.map((x) => x.value),
  cancelReasons: f.cancelReasons.map((x) => x.value.trim()),
  rejectReasons: f.rejectReasons.map((x) => x.value.trim()),
  noGrantReasons: f.noGrantReasons.map((x) => x.value.trim()),
  avgDocTypes: f.avgDocTypes.map((x) => x.value.trim()),
})

const LABELS: Record<keyof Settings, string> = {
  qarzRate: 'نرخ قرض‌الحسنه',
  sepahEnabled: 'حقوق‌بگیر بانک سپه',
  multYes: 'ضریب حقوق‌بگیر بانک سپه',
  years: 'مدت قرارداد',
  grace: 'مهلت پس از انقضا',
  maxPlans: 'حداکثر تعداد طرح',
  delay: 'مهلت معرفی پرسنل',
  murRates: 'نرخ‌های مرابحه',
  terms: 'مدت‌های بازپرداخت',
  usable: 'جدول درصد قابل‌استفاده',
  cancelReasons: 'دلایل لغو قرارداد',
  rejectReasons: 'دلایل رد درخواست',
  noGrantReasons: 'دلایل عدم اعطای تسهیلات غیرحضوری',
  avgDocTypes: 'انواع مستند میانگین',
}

const show = (v: unknown) => (Array.isArray(v) && !Array.isArray(v[0]) ? v.join('، ') : typeof v === 'boolean' ? (v ? 'بله' : 'خیر') : Array.isArray(v) ? '(جدول)' : String(v))

export function diffSettings(before: Settings, next: Settings): string[] {
  return (Object.keys(LABELS) as (keyof Settings)[])
    .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(next[k]))
    .map((k) => `${LABELS[k]}: ${show(before[k])} ← ${show(next[k])}`)
}
