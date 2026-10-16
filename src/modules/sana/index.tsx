/**
 * ماژول «سانا» — فلوی اعتباری طرح نگین میثاق.
 * همه چیزِ این فلو (داده، منطق، صفحات) داخل همین پوشه است و فقط از '@/core' استفاده می‌کند.
 */
import { BarChartOutlined, CheckCircleOutlined, CreditCardOutlined, SettingOutlined, ShopOutlined, TeamOutlined, UserSwitchOutlined } from '@ant-design/icons'
import { lazy } from 'react'
import type { AppModule } from '@/core'

export const sanaModule: AppModule = {
  key: 'sana',
  title: 'طرح نگین میثاق',
  pages: [
    {
      path: 'settings',
      perm: 'base.view',
      title: 'اطلاعات پایه طرح',
      description: 'پارامترها، نرخ‌ها، جدول درصدها و فهرست‌های کشویی طرح نگین میثاق.',
      icon: <SettingOutlined />,
      group: 'تنظیمات',
      component: lazy(() => import('./pages/settings/SettingsPage')),
    },
    {
      path: 'companies',
      title: 'مدیریت شرکت‌ها',
      description: 'ثبت شرکت‌ها، طرح‌های تفاهم‌نامه، لغو قرارداد و میانگین موجودی ماهانه.',
      icon: <ShopOutlined />,
      group: 'مدیریت',
      component: lazy(() => import('./pages/companies/CompaniesPage')),
    },
    {
      path: 'staff',
      title: 'پرسنل شرکت',
      description: 'فهرست پرسنل هر شرکت با اولویت تخصیص؛ ثبت تکی یا بارگذاری گروهی از اکسل.',
      icon: <TeamOutlined />,
      group: 'مدیریت',
      component: lazy(() => import('./pages/staff/StaffPage')),
    },
    {
      path: 'credit',
      title: 'تخصیص وام',
      description: 'محاسبه اعتبار قابل استفاده و ثبت درخواست وام برای پرسنل.',
      icon: <CreditCardOutlined />,
      group: 'عملیات اعتباری',
      component: lazy(() => import('./pages/credit/CreditPage')),
    },
    {
      path: 'manager-approval',
      perm: 'mgrApprove.view',
      title: 'تأیید مدیر شرکت',
      description: 'بررسی درخواست‌ها توسط مدیر شرکت پیش از ارسال به اعتبارات.',
      icon: <UserSwitchOutlined />,
      group: 'عملیات اعتباری',
      component: lazy(() => import('./pages/approvals/ManagerApprovalPage')),
    },
    {
      path: 'approvals',
      perm: 'approve.view',
      title: 'تأیید اعتبارات',
      description: 'تأیید یا رد نهایی درخواست‌ها و پیگیری مرحله پس از تأیید.',
      icon: <CheckCircleOutlined />,
      group: 'عملیات اعتباری',
      component: lazy(() => import('./pages/approvals/CreditApprovalPage')),
    },
    {
      path: 'dashboard',
      perm: 'dash.view',
      title: 'داشبورد مدیریتی',
      description: 'شاخص‌ها، نمودارها و رتبه‌بندی عملکرد شرکت‌ها.',
      icon: <BarChartOutlined />,
      group: 'گزارش و کنترل',
      component: lazy(() => import('./pages/dashboard/DashboardPage')),
    },
  ],
  permissions: [
    { key: 'base', label: 'اطلاعات پایه', services: [['view', 'مشاهده'], ['edit', 'ویرایش']] },
    {
      key: 'companies',
      label: 'مدیریت شرکت‌ها',
      services: [['view', 'مشاهده'], ['add', 'ثبت'], ['edit', 'ویرایش'], ['cancel', 'لغو قرارداد'], ['delete', 'حذف'], ['avg', 'میانگین موجودی']],
    },
    { key: 'staff', label: 'پرسنل شرکت', services: [['view', 'مشاهده'], ['add', 'افزودن'], ['edit', 'ویرایش'], ['delete', 'حذف'], ['upload', 'بارگذاری گروهی']] },
    { key: 'credit', label: 'تخصیص وام', services: [['view', 'مشاهده'], ['submit', 'ثبت درخواست']] },
    { key: 'mgrApprove', label: 'تأیید مدیر شرکت', services: [['view', 'مشاهده'], ['approve', 'تأیید'], ['reject', 'رد']] },
    { key: 'approve', label: 'تأیید اعتبارات', services: [['view', 'مشاهده'], ['approve', 'تأیید'], ['reject', 'رد'], ['stage', 'مرحله پس از تأیید']] },
    { key: 'dash', label: 'داشبورد', services: [['view', 'مشاهده'], ['export', 'خروجی اکسل']] },
  ],
  auditCategories: [
    { value: 'SETTINGS', label: 'اطلاعات پایه', color: 'geekblue' },
    { value: 'COMPANY', label: 'شرکت', color: 'gold' },
    { value: 'STAFF', label: 'پرسنل', color: 'cyan' },
    { value: 'LOAN', label: 'وام', color: 'green' },
  ],
}
