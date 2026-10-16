import type { StatusMeta } from '@/core/ui'
import type { RequestStatus, Settings } from '../types'

export const STATUS_META: Record<RequestStatus, StatusMeta> = {
  PENDING_MANAGER: { label: 'در انتظار مدیر شرکت', color: 'gold' },
  REJECTED_MANAGER: { label: 'رد توسط مدیر شرکت', color: 'volcano' },
  PENDING_CREDIT: { label: 'در انتظار اعتبارات', color: 'blue' },
  APPROVED: { label: 'تأیید شده', color: 'green' },
  REJECTED: { label: 'رد شده', color: 'red' },
}

/** درخواست‌هایی که اعتبار را مصرف می‌کنند (هر دو نوع رد، اعتبار را آزاد می‌کنند) */
export const isConsuming = (s: RequestStatus) => s !== 'REJECTED' && s !== 'REJECTED_MANAGER'
export const isPending = (s: RequestStatus) => s === 'PENDING_MANAGER' || s === 'PENDING_CREDIT'

export const POST_APPROVAL_STAGES = [
  'تشکیل پرونده در شعبه',
  'دریافت تسهیلات از امید بانک',
  'دریافت تسهیلات در شعبه',
  'عدم اعطای تسهیلات غیرحضوری',
] as const
export const NO_GRANT_STAGE = 'عدم اعطای تسهیلات غیرحضوری'

export const DEFAULT_SETTINGS: Settings = {
  qarzRate: 4,
  sepahEnabled: true,
  multYes: 1.1,
  years: 1,
  grace: 4,
  maxPlans: 5,
  delay: 1,
  murRates: [5, 10, 15, 20, 23],
  terms: [12, 24, 36, 48, 60],
  usable: [
    [8, 10, 15, 25, 35, 45],
    [6, 8, 10, 15, 20, 25],
    [5, 6, 8, 10, 15, 20],
    [4, 4, 6, 8, 10, 15],
    [3, 3, 5, 6, 8, 10],
  ],
  cancelReasons: ['عدم تمدید به درخواست شرکت', 'لغو قرارداد توسط مدیریت شعب منطقه'],
  rejectReasons: ['عدم کنترل سقف فردی', 'پایین بودن رتبه اعتباری'],
  noGrantReasons: ['رتبه اعتباری غیرمجاز', 'عدم کفایت سقف تسهیلات بر اساس اعتبارسنجی'],
  avgDocTypes: ['نامه', 'تصویر بنکو'],
}
