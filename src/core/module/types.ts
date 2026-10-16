import type { ComponentType, LazyExoticComponent, ReactNode } from 'react'

/** یک گروه مجوز (معمولاً یک صفحه) و سرویس‌های آن؛ کلید نهایی: `${key}.${service}` */
export interface PermissionGroup {
  key: string
  label: string
  /** [کلید سرویس، برچسب] — سرویس 'view' برای دیدن صفحه لازم است */
  services: [string, string][]
}

export interface PageDef {
  /** مسیر نسبی بدون اسلش، مثل 'companies' */
  path: string
  title: string
  /** توضیح کوتاه زیر عنوان صفحه */
  description?: string
  icon?: ReactNode
  /** برچسب گروه منو، مثل «مدیریت» */
  group?: string
  /** مجوز لازم برای دیدن صفحه؛ پیش‌فرض: `${path}.view` */
  perm?: string
  component: LazyExoticComponent<ComponentType> | ComponentType
  hideInMenu?: boolean
}

export interface AuditCategoryDef {
  value: string
  label: string
  color?: string
}

/**
 * ماژول = یک «فلو»ی مستقل (مثلاً سانا، مدیریت کاربران، ...).
 * برای افزودن فلوی جدید: یک پوشه در src/modules بسازید، یک AppModule export کنید
 * و آن را در src/app/modules.ts اضافه کنید. منو، مسیرها و ماتریس دسترسی خودکار ساخته می‌شوند.
 */
export interface AppModule {
  key: string
  title: string
  pages: PageDef[]
  permissions: PermissionGroup[]
  auditCategories?: AuditCategoryDef[]
}
