import type { Role, RolePerms } from '@/types'

export type TabKey =
  | 'base'
  | 'companies'
  | 'staff'
  | 'credit'
  | 'mgrApprove'
  | 'approve'
  | 'dash'
  | 'users'
  | 'log'

export const TABS: { key: TabKey; label: string }[] = [
  { key: 'base', label: 'اطلاعات پایه' },
  { key: 'companies', label: 'مدیریت شرکت‌ها' },
  { key: 'staff', label: 'پرسنل شرکت' },
  { key: 'credit', label: 'تخصیص وام' },
  { key: 'mgrApprove', label: 'تأیید مدیر شرکت' },
  { key: 'approve', label: 'تأیید اعتبارات' },
  { key: 'dash', label: 'داشبورد مدیریتی' },
  { key: 'users', label: 'مدیریت کاربران' },
  { key: 'log', label: 'گزارش تغییرات' },
]

/** سرویس‌های هر تب (کنترل دسترسی در سطح عملیات) */
export const SERVICES: Record<TabKey, [string, string][]> = {
  base: [['view', 'مشاهده'], ['edit', 'ویرایش اطلاعات پایه']],
  companies: [
    ['view', 'مشاهده'], ['add', 'ثبت شرکت'], ['edit', 'ویرایش شرکت'],
    ['cancel', 'لغو قرارداد'], ['delete', 'حذف شرکت'], ['avg', 'ثبت میانگین موجودی'],
  ],
  staff: [
    ['view', 'مشاهده'], ['add', 'افزودن پرسنل'], ['edit', 'ویرایش پرسنل'],
    ['delete', 'حذف پرسنل'], ['upload', 'بارگذاری گروهی'],
  ],
  credit: [['view', 'مشاهده'], ['submit', 'ثبت درخواست وام']],
  mgrApprove: [['view', 'مشاهده'], ['approve', 'تأیید'], ['reject', 'رد']],
  approve: [['view', 'مشاهده'], ['approve', 'تأیید'], ['reject', 'رد'], ['stage', 'تغییر مرحله پس از تأیید']],
  dash: [['view', 'مشاهده'], ['export', 'خروجی اکسل']],
  users: [['view', 'مشاهده'], ['edit', 'ثبت/ویرایش/حذف کاربر'], ['roles', 'مدیریت دسترسی نقش‌ها']],
  log: [['view', 'مشاهده'], ['rollback', 'بازگردانی']],
}

/** کلید یک مجوز، مثل companies.add */
export type PermKey = `${TabKey}.${string}`

export const expandTabs = (tabs: TabKey[]): string[] =>
  tabs.flatMap((t) => SERVICES[t].map(([s]) => `${t}.${s}`))

export const DEFAULT_ROLE_PERMS: RolePerms = {
  SYSTEM_ADMIN: expandTabs(TABS.map((t) => t.key)),
  COMPANY_MANAGER: expandTabs(['mgrApprove']),
  COMPANY_HR: expandTabs(['staff']),
  BRANCH_CREDIT: expandTabs(['credit', 'approve', 'dash']),
  DIGITAL_BRANCH: expandTabs(['companies', 'staff', 'credit', 'dash']),
}

/** اگر سرویسی از یک تب فعال است، مشاهده همان تب هم لازم است */
export function withImpliedView(perms: string[]): string[] {
  const set = new Set(perms)
  perms.forEach((p) => set.add(`${p.split('.')[0]}.view`))
  return [...set]
}

export const ROLE_KEYS = Object.keys(DEFAULT_ROLE_PERMS) as Role[]
