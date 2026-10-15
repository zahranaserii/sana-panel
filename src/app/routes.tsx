import { lazy, type ReactNode } from 'react'
import type { TabKey } from '@/domain/permissions'

// هر صفحه جداگانه lazy-load می‌شود (code splitting)
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))
const CompaniesPage = lazy(() => import('@/features/companies/CompaniesPage'))
const StaffPage = lazy(() => import('@/features/staff/StaffPage'))
const CreditPage = lazy(() => import('@/features/credit/CreditPage'))
const ManagerApprovalPage = lazy(() => import('@/features/approvals/ManagerApprovalPage'))
const CreditApprovalPage = lazy(() => import('@/features/approvals/CreditApprovalPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const UsersPage = lazy(() => import('@/features/users/UsersPage'))
const AuditLogPage = lazy(() => import('@/features/audit/AuditLogPage'))

export const ROUTES: { tab: TabKey; path: string; title: string; element: ReactNode }[] = [
  { tab: 'base', path: 'settings', title: 'اطلاعات پایه طرح', element: <SettingsPage /> },
  { tab: 'companies', path: 'companies', title: 'مدیریت شرکت‌ها', element: <CompaniesPage /> },
  { tab: 'staff', path: 'staff', title: 'پرسنل شرکت', element: <StaffPage /> },
  { tab: 'credit', path: 'credit', title: 'تخصیص وام', element: <CreditPage /> },
  { tab: 'mgrApprove', path: 'manager-approval', title: 'تأیید مدیر شرکت', element: <ManagerApprovalPage /> },
  { tab: 'approve', path: 'approvals', title: 'تأیید اعتبارات', element: <CreditApprovalPage /> },
  { tab: 'dash', path: 'dashboard', title: 'داشبورد مدیریتی', element: <DashboardPage /> },
  { tab: 'users', path: 'users', title: 'مدیریت کاربران', element: <UsersPage /> },
  { tab: 'log', path: 'audit-log', title: 'گزارش تغییرات', element: <AuditLogPage /> },
]
