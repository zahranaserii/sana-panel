/**
 * ماژول «مدیریت» — عمومی و مستقل از پروژه (کاربران، دسترسی نقش‌ها، گزارش تغییرات).
 * در هر پروژه‌ای که از این قالب ساخته شود قابل استفاده است.
 */
import { AuditOutlined, SafetyOutlined } from '@ant-design/icons'
import { lazy } from 'react'
import type { AppModule } from '@/core'

export const adminModule: AppModule = {
  key: 'admin',
  title: 'مدیریت سامانه',
  pages: [
    {
      path: 'users',
      title: 'مدیریت کاربران',
      description: 'تعریف کاربران و تعیین دسترسی هر نقش به صفحات و عملیات.',
      icon: <SafetyOutlined />,
      group: 'گزارش و کنترل',
      component: lazy(() => import('./UsersPage')),
    },
    {
      path: 'log',
      title: 'گزارش تغییرات',
      description: 'هر ثبت، ویرایش، لغو یا حذف همراه با نام کاربر و زمان؛ با امکان بازگردانی.',
      icon: <AuditOutlined />,
      group: 'گزارش و کنترل',
      component: lazy(() => import('./AuditLogPage')),
    },
  ],
  permissions: [
    { key: 'users', label: 'مدیریت کاربران', services: [['view', 'مشاهده'], ['edit', 'ثبت/ویرایش/حذف'], ['roles', 'دسترسی نقش‌ها']] },
    { key: 'log', label: 'گزارش تغییرات', services: [['view', 'مشاهده'], ['rollback', 'بازگردانی']] },
  ],
  auditCategories: [{ value: 'USER', label: 'کاربر', color: 'purple' }],
}
