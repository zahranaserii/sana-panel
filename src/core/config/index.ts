/**
 * پیکربندی اپلیکیشن — تنها چیزی که هسته (core) از «پروژه» می‌داند.
 * هر پروژه یک AppConfig در src/app/config.ts می‌سازد و در main.tsx با configureApp ثبت می‌کند.
 */
import type { ReactNode } from 'react'
import type { AppModule } from '../module/types'

export interface RoleDef {
  value: string
  label: string
  /** مجوزهای پیش‌فرض: 'companies' = همه عملیات آن صفحه، 'companies.view' = فقط یک عملیات، '*' = همه */
  defaultPerms: string[] | '*'
  color?: string
}

export interface SeedUser {
  username: string
  password: string
  fullName: string
  userCode: string
  unitName: string
  unitCode: string
  role: string
}

export interface AppConfig {
  /** نام کامل سامانه (عنوان مرورگر، صفحه ورود، منو) */
  appName: string
  /** زیرعنوان زیر لوگو */
  subtitle?: string
  logo: string
  /** لوگوی دوم (مثلاً شرکت توسعه‌دهنده) در هدر */
  partnerLogo?: string
  footer?: ReactNode
  /** پیشوند کلیدهای localStorage تا چند پروژه روی یک دامنه تداخل نداشته باشند */
  storagePrefix: string
  /** برچسب «واحد سازمانی» کاربران — مثلاً «شعبه»، «دپارتمان» */
  orgUnitLabel: string
  roles: RoleDef[]
  /** نقشی که همیشه همه دسترسی‌ها را دارد (جلوگیری از قفل شدن سامانه) */
  adminRole: string
  /** کاربر اولیه سامانه */
  initialAdmin: SeedUser
  demo: {
    enabled: boolean
    users: SeedUser[]
  }
  theme: {
    primary: string
    accent: string
    siderGradient: [string, string, string]
  }
  /** تأخیر شبیه‌سازی‌شده پاسخ Mock API (میلی‌ثانیه) */
  mockDelay: number
}

let config: AppConfig | null = null
let modules: AppModule[] = []
const listeners: (() => void)[] = []

export function configureApp(c: AppConfig, m: AppModule[]) {
  config = c
  modules = m
  if (typeof document !== 'undefined') document.title = c.appName
  listeners.splice(0).forEach((fn) => fn())
}

/**
 * اجرای fn پس از ثبت پیکربندی (یا فوراً اگر ثبت شده).
 * برای storeهای ماندگار که کلیدشان به storagePrefix وابسته است و هنگام import ساخته می‌شوند.
 */
export function onConfigured(fn: () => void) {
  if (config) fn()
  else listeners.push(fn)
}

export function appConfig(): AppConfig {
  if (!config) throw new Error('configureApp() باید قبل از رندر اپ صدا زده شود')
  return config
}

export const appModules = () => modules
