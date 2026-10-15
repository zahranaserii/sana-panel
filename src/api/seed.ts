/** داده نمونه برای دمو (با VITE_DEMO_DATA=true) */
import { buildPlanMatrix } from '@/domain/credit'
import { dateToISO, jalaliToISO, jParts, todayISO } from '@/lib/jalali'
import type { Company, Staff } from '@/types'
import type { DB } from './db'

const id = () => crypto.randomUUID()

/** ساخت کد ملی معتبر از ۹ رقم */
function nationalCode(nine: string) {
  const sum = nine.split('').reduce((s, d, i) => s + Number(d) * (10 - i), 0)
  const r = sum % 11
  return nine + String(r < 2 ? r : 11 - r)
}

/** ساخت شناسه ملی معتبر از ۱۰ رقم */
function legalId(ten: string) {
  const digits = ten.split('').map(Number)
  const dec = digits[9] + 2
  const coef = [29, 27, 23, 19, 17, 29, 27, 23, 19, 17]
  let r = coef.reduce((s, c, i) => s + (digits[i] + dec) * c, 0) % 11
  if (r === 10) r = 0
  return ten + r
}

export function buildDemoData(db: DB) {
  const today = jParts(todayISO())
  const back = new Date()
  back.setDate(back.getDate() - 100)
  const contract = jParts(dateToISO(back))
  const contractDate = jalaliToISO(contract.y, contract.m, contract.d)!
  // روز افتتاح حساب = روز امروز تا در دمو امکان ثبت درخواست وجود داشته باشد
  const openDate = jalaliToISO(contract.y, contract.m, Math.min(today.d, 29))!

  const matrix = buildPlanMatrix(db.settings)
  const pick = (keys: string[]) => {
    const plans = matrix.filter((p) => keys.includes(p.key))
    return plans.map((p) => ({ ...p, sharePercent: 100 / plans.length }))
  }

  const stamp = { userName: 'مدیر سامانه', userCode: '001', branchName: 'ستاد مرکزی', branchCode: '150000' }
  const companies: Company[] = [
    {
      id: id(), name: 'شرکت فولاد نگین', nationalId: legalId('1010123456'), agreementNo: 'NM-1001',
      account: '0101234567001', contractDate, openDate, sepah: true, agreementFile: '',
      plans: pick(['QARZ|12|4', 'MURABAHA|24|10']),
      monthlyAverages: [52_000_000_000, 48_000_000_000, 61_000_000_000, null, null, null, null, null, null, null, null, null],
      avgDocs: [], registeredBy: stamp, createdAt: new Date().toISOString(), cancellation: null, deletedAt: null,
    },
    {
      id: id(), name: 'شرکت داده‌پردازان میثاق', nationalId: legalId('1032987654'), agreementNo: 'NM-1002',
      account: '0109876543001', contractDate, openDate, sepah: false, agreementFile: '',
      plans: pick(['MURABAHA|36|15']),
      monthlyAverages: [18_000_000_000, 21_500_000_000, null, null, null, null, null, null, null, null, null, null],
      avgDocs: [], registeredBy: stamp, createdAt: new Date().toISOString(), cancellation: null, deletedAt: null,
    },
  ]
  const names = ['علی محمدی', 'زهرا احمدی', 'رضا کریمی', 'مریم رضایی', 'حسین موسوی', 'فاطمه حسینی']
  const staff: Staff[] = []
  companies.forEach((c, ci) =>
    names.forEach((n, i) =>
      staff.push({
        id: id(), companyId: c.id, fullName: n,
        nationalCode: nationalCode(`00${ci}12345${i}`.slice(0, 9)),
        mobile: `0912${ci}${String(1000000 + i * 1111).slice(1)}`.slice(0, 11),
        personnelCode: String(100 + i), hireDate: jalaliToISO(1400 + (i % 4), 1 + i, 10), priority: i + 1,
      }),
    ),
  )
  db.companies = companies
  db.staff = staff
  const demoUsers = [
    ['manager', 'مدیر شرکت نمونه', 'COMPANY_MANAGER'],
    ['hr', 'کارشناس منابع انسانی', 'COMPANY_HR'],
    ['credit', 'کارشناس اعتبارات', 'BRANCH_CREDIT'],
    ['digital', 'کارشناس شعبه دیجیتال', 'DIGITAL_BRANCH'],
  ] as const
  demoUsers.forEach(([username, fullName, role], i) =>
    db.users.push({
      id: id(), username, password: '123456', fullName, userCode: String(400 + i),
      branchName: 'شعبه بازار تهران', branchCode: '150002', role,
    }),
  )
}
