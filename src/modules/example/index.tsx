/**
 * ماژول نمونه (الگو) — برای ساخت یک فلوی جدید این پوشه را کپی کنید:
 *   1. api.ts       → createMockStore + توابع CRUD (بعداً با HTTP واقعی جایگزین می‌شود)
 *   2. *Page.tsx    → صفحه با Page/SectionCard/DataTable/FormDrawer
 *   3. index.tsx    → تعریف AppModule (صفحات، مجوزها، دسته‌های گزارش تغییرات)
 *   4. src/app/modules.ts → افزودن ماژول به فهرست
 * پیش‌فرض غیرفعال است؛ با VITE_EXAMPLE_MODULE=true در .env فعال می‌شود.
 */
import { NotificationOutlined } from '@ant-design/icons'
import { lazy } from 'react'
import type { AppModule } from '@/core'

export const exampleModule: AppModule = {
  key: 'example',
  title: 'اطلاعیه‌ها (نمونه)',
  pages: [
    {
      path: 'notices',
      title: 'اطلاعیه‌ها',
      description: 'ماژول نمونه برای نشان دادن نحوه افزودن یک فلوی جدید.',
      icon: <NotificationOutlined />,
      group: 'ارتباطات',
      component: lazy(() => import('./AnnouncementsPage')),
    },
  ],
  permissions: [{ key: 'notices', label: 'اطلاعیه‌ها', services: [['view', 'مشاهده'], ['edit', 'ثبت/ویرایش/حذف']] }],
  auditCategories: [{ value: 'NOTICE', label: 'اطلاعیه', color: 'magenta' }],
}
