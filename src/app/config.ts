/**
 * ⚙️ پیکربندی پروژه — برای ساخت پروژه جدید از این قالب، این فایل و modules.ts را تغییر دهید.
 */
import type { AppConfig } from '@/core'

const demoPassword = '123456'

export const appConfig: AppConfig = {
  appName: 'سامانه اعتباری نوید امید (سانا)',
  subtitle: 'طرح نگین میثاق',
  logo: '/img/sana-logo.png',
  partnerLogo: '/img/omid-boom.png',
  footer: 'توسعه‌دهنده: شرکت امید بوم بانک سپه — کلیه حقوق مادی و معنوی متعلق به این شرکت است.',
  storagePrefix: 'sana-v3',
  orgUnitLabel: 'شعبه',

  adminRole: 'SYSTEM_ADMIN',
  roles: [
    { value: 'SYSTEM_ADMIN', label: 'مدیر سامانه', defaultPerms: '*', color: 'gold' },
    { value: 'COMPANY_MANAGER', label: 'مدیر شرکت', defaultPerms: ['mgrApprove'], color: 'purple' },
    { value: 'COMPANY_HR', label: 'منابع انسانی شرکت', defaultPerms: ['staff'], color: 'cyan' },
    { value: 'BRANCH_CREDIT', label: 'اعتبارات شعبه', defaultPerms: ['credit', 'approve', 'dash'], color: 'green' },
    { value: 'DIGITAL_BRANCH', label: 'شعبه دیجیتال', defaultPerms: ['companies', 'staff', 'credit', 'dash'], color: 'blue' },
  ],

  initialAdmin: { username: 'admin', password: 'admin', fullName: 'مدیر سامانه', userCode: '001', unitName: 'ستاد مرکزی', unitCode: '150000', role: 'SYSTEM_ADMIN' },

  demo: {
    // پیش‌فرض فعال؛ با VITE_DEMO_DATA=false در .env سامانه خالی شروع می‌شود
    enabled: import.meta.env.VITE_DEMO_DATA !== 'false',
    users: [
      { username: 'manager', password: demoPassword, fullName: 'مدیر شرکت نمونه', userCode: '400', unitName: 'شرکت فولاد نگین', unitCode: '000', role: 'COMPANY_MANAGER' },
      { username: 'hr', password: demoPassword, fullName: 'کارشناس منابع انسانی', userCode: '401', unitName: 'شرکت فولاد نگین', unitCode: '000', role: 'COMPANY_HR' },
      { username: 'credit', password: demoPassword, fullName: 'کارشناس اعتبارات', userCode: '402', unitName: 'شعبه بازار تهران', unitCode: '150002', role: 'BRANCH_CREDIT' },
      { username: 'digital', password: demoPassword, fullName: 'کارشناس شعبه دیجیتال', userCode: '403', unitName: 'شعبه بازار تهران', unitCode: '150002', role: 'DIGITAL_BRANCH' },
      { username: 'credit2', password: demoPassword, fullName: 'معاون اعتباری منطقه', userCode: '404', unitName: 'شعبه ونک', unitCode: '150017', role: 'BRANCH_CREDIT' },
    ],
  },

  theme: {
    primary: '#0E2B47',
    accent: '#C99A2E',
    siderGradient: ['#0A2239', '#0E2B47', '#123A5E'],
  },

  mockDelay: Number(import.meta.env.VITE_MOCK_DELAY ?? 150),
}
