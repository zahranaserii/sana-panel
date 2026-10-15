import type { AuditCategory, RequestStatus, Role, Settings } from '@/types'

export const STATUS_META: Record<RequestStatus, { label: string; color: string }> = {
  PENDING_MANAGER: { label: 'در انتظار تأیید مدیر شرکت', color: 'gold' },
  REJECTED_MANAGER: { label: 'رد شده توسط مدیر شرکت', color: 'red' },
  PENDING_CREDIT: { label: 'در انتظار تأیید اعتبارات', color: 'blue' },
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

export const ROLES: { value: Role; label: string }[] = [
  { value: 'SYSTEM_ADMIN', label: 'مدیر سامانه' },
  { value: 'COMPANY_MANAGER', label: 'مدیر شرکت' },
  { value: 'COMPANY_HR', label: 'منابع انسانی شرکت' },
  { value: 'BRANCH_CREDIT', label: 'اعتبارات شعبه' },
  { value: 'DIGITAL_BRANCH', label: 'شعبه دیجیتال' },
]
export const roleLabel = (r: Role) => ROLES.find((x) => x.value === r)?.label ?? r

export const AUDIT_CATEGORIES: { value: AuditCategory; label: string }[] = [
  { value: 'SETTINGS', label: 'اطلاعات پایه' },
  { value: 'COMPANY', label: 'شرکت' },
  { value: 'STAFF', label: 'پرسنل' },
  { value: 'LOAN', label: 'وام' },
  { value: 'USER', label: 'کاربر' },
]
export const auditCategoryLabel = (c: AuditCategory) =>
  AUDIT_CATEGORIES.find((x) => x.value === c)?.label ?? c

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
