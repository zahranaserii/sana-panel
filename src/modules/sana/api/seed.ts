/**
 * داده نمونه ماژول سانا — وقتی appConfig().demo.enabled باشد ساخته می‌شود.
 * تاریخ‌ها نسبت به «امروز» ساخته می‌شوند تا همیشه داده ماه‌های اخیر و جاری وجود داشته باشد.
 */
import type { AuditEntry } from '@/core/data/identity'
import { faDigits } from '@/core/lib/digits'
import { uid as id } from '@/core/lib/id'
import { formatJalali, jalaliToISO, jParts, todayISO } from '@/core/lib/jalali'
import { NO_GRANT_STAGE } from '../domain/constants'
import { buildPlanMatrix, planLabel } from '../domain/credit'
import type { Company, ISODate, LoanRequest, RequestStatus, Staff, UserStamp } from '../types'
import type { SanaState } from './store'

const ADMIN = 'مدیر سامانه (admin)'

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

const T = jParts(todayISO())

/** تاریخ شمسی «n ماه قبل» در روز مشخص (روز به ۲۹ محدود می‌شود تا در همه ماه‌ها معتبر باشد) */
function monthsAgo(n: number, day: number): ISODate {
  let y = T.y
  let m = T.m - n
  while (m < 1) {
    m += 12
    y -= 1
  }
  return jalaliToISO(y, m, Math.min(day, 29))!
}

const FIRST = ['علی', 'زهرا', 'رضا', 'مریم', 'حسین', 'فاطمه', 'محمد', 'سارا', 'امیر', 'نرگس', 'مهدی', 'الهام']
const LAST = ['محمدی', 'احمدی', 'کریمی', 'رضایی', 'موسوی', 'حسینی', 'جعفری', 'صادقی', 'رحیمی', 'نوری', 'کاظمی', 'طاهری']

interface CompanySpec {
  name: string
  nid: string
  agreementNo: string
  contractMonthsAgo: number
  openDay: number
  sepah: boolean
  planKeys: string[]
  averages: number[]
  staffCount: number
  state?: 'cancelled' | 'deleted'
}

const SPECS: CompanySpec[] = [
  {
    name: 'شرکت فولاد نگین', nid: '1010123456', agreementNo: 'NM-1401', contractMonthsAgo: 4,
    openDay: T.d, // روز مجاز انتقال = امروز تا ثبت درخواست در دمو ممکن باشد
    sepah: true, planKeys: ['QARZ|12|4', 'MURABAHA|24|10'],
    averages: [52, 48, 61, 55].map((x) => x * 1e9), staffCount: 10,
  },
  {
    name: 'شرکت داده‌پردازان میثاق', nid: '1032987654', agreementNo: 'NM-1402', contractMonthsAgo: 6,
    openDay: T.d, sepah: false, planKeys: ['MURABAHA|36|15'],
    averages: [18, 21.5, 19, 24, 22].map((x) => x * 1e9), staffCount: 8,
  },
  {
    name: 'صنایع غذایی آریا', nid: '1045566778', agreementNo: 'NM-1403', contractMonthsAgo: 7,
    openDay: T.d === 5 ? 6 : 5, // عمداً روز دیگری تا پیام «امروز روز مجاز انتقال نیست» دیده شود
    sepah: true, planKeys: ['QARZ|24|4', 'MURABAHA|12|5', 'MURABAHA|48|20'],
    averages: [35, 38, 41, 37, 44, 46].map((x) => x * 1e9), staffCount: 9,
  },
  {
    name: 'پخش دارویی سینا', nid: '1056677889', agreementNo: 'NM-1404', contractMonthsAgo: 5,
    openDay: 12, sepah: false, planKeys: ['QARZ|12|4'],
    averages: [32, 34, 29].map((x) => x * 1e9), staffCount: 6, state: 'cancelled',
  },
  {
    name: 'حمل‌ونقل البرز', nid: '1067788990', agreementNo: 'NM-1405', contractMonthsAgo: 6,
    openDay: 20, sepah: false, planKeys: ['MURABAHA|24|10'],
    averages: [28, 31].map((x) => x * 1e9), staffCount: 5, state: 'deleted',
  },
]

/** برنامه درخواست‌ها: [ماه قبل، وضعیت، مبلغ (میلیون ریال)] */
const REQUEST_PLAN: [number, RequestStatus, number][] = [
  [3, 'APPROVED', 800], [3, 'APPROVED', 650], [3, 'REJECTED', 900],
  [2, 'APPROVED', 700], [2, 'APPROVED', 500], [2, 'REJECTED_MANAGER', 400],
  [1, 'APPROVED', 600], [1, 'REJECTED', 750],
  [0, 'PENDING_CREDIT', 550], [0, 'PENDING_CREDIT', 450], [0, 'PENDING_MANAGER', 500], [0, 'PENDING_MANAGER', 350],
]
const STAGES = ['تشکیل پرونده در شعبه', 'دریافت تسهیلات از امید بانک', 'دریافت تسهیلات در شعبه', NO_GRANT_STAGE, '']

/** داده نمونه را در state می‌سازد و سابقه تغییرات متناظر را برمی‌گرداند */
export function buildDemoData(db: SanaState): Omit<AuditEntry, 'id' | 'rolledBack'>[] {
  const stamp = (branchName: string, userName: string, userCode: string): UserStamp => ({
    userName, userCode, branchName, branchCode: '150002',
  })
  const branchStamp = stamp('شعبه بازار تهران', 'کارشناس شعبه دیجیتال', '403')

  const matrix = buildPlanMatrix(db.settings)
  const companies: Company[] = []
  const staff: Staff[] = []
  const requests: LoanRequest[] = []
  const audit: Omit<AuditEntry, 'id' | 'rolledBack'>[] = []
  const log = (date: ISODate, time: string, user: string, category: AuditEntry['category'], details: string) =>
    audit.push({ at: `${formatJalali(date)}، ${faDigits(time)}`, user, category, details, snapshot: null })

  SPECS.forEach((spec, ci) => {
    const contractDate = monthsAgo(spec.contractMonthsAgo, 10)
    const openDate = monthsAgo(spec.contractMonthsAgo, spec.openDay)
    const chosen = matrix.filter((p) => spec.planKeys.includes(p.key))
    const c: Company = {
      id: id(),
      name: spec.name,
      nationalId: legalId(spec.nid),
      agreementNo: spec.agreementNo,
      account: `0101${String(ci + 1).padStart(6, '0')}001`,
      contractDate,
      openDate,
      sepah: spec.sepah,
      agreementFile: `تفاهم‌نامه-${spec.agreementNo}.pdf`,
      plans: chosen.map((p) => ({ ...p, sharePercent: 100 / chosen.length })),
      monthlyAverages: [...spec.averages, ...Array(12 - spec.averages.length).fill(null)],
      avgDocs: [
        {
          id: id(), date: monthsAgo(1, 3), months: spec.averages.map((_, i) => i + 1),
          type: ci % 2 ? 'تصویر بنکو' : 'نامه', fileName: `میانگین-${spec.agreementNo}.pdf`,
          note: 'ثبت اولیه میانگین‌ها بر اساس گردش حساب', user: 'کارشناس شعبه دیجیتال',
        },
      ],
      registeredBy: branchStamp,
      createdAt: new Date().toISOString(),
      cancellation:
        spec.state === 'cancelled'
          ? { date: monthsAgo(1, 8), reason: 'عدم تمدید به درخواست شرکت', note: 'نامه شماره ۳۴۵/ص', fileName: 'نامه-لغو.pdf' }
          : null,
      deletedAt: spec.state === 'deleted' ? monthsAgo(1, 14) : null,
    }
    companies.push(c)
    log(contractDate, '09:15', 'کارشناس شعبه دیجیتال (digital)', 'COMPANY', `ثبت شرکت جدید: ${c.name}`)

    const companyStaff: Staff[] = Array.from({ length: spec.staffCount }, (_, i) => ({
      id: id(),
      companyId: c.id,
      fullName: `${FIRST[(i + ci * 3) % FIRST.length]} ${LAST[(i * 5 + ci) % LAST.length]}`,
      nationalCode: nationalCode(`${ci + 1}${String(i).padStart(2, '0')}${String(4567890 + ci * 13 + i * 7).slice(-6)}`),
      mobile: `09${String(120000000 + ci * 1_000_000 + i * 31_337).slice(0, 9)}`,
      personnelCode: String((ci + 1) * 100 + i + 1),
      hireDate: jalaliToISO(1396 + ((i + ci) % 8), 1 + ((i * 3) % 12), 1 + ((i * 7) % 28)),
      priority: i + 1,
    }))
    staff.push(...companyStaff)
    log(contractDate, '11:40', 'کارشناس منابع انسانی (hr)', 'STAFF', `بارگذاری گروهی ${faDigits(companyStaff.length)} پرسنل از فایل اکسل (${c.name})`)

    // ---------- درخواست‌های وام ----------
    const plan = (seq: number) => c.plans[seq % c.plans.length]
    const reqPlan = spec.state ? REQUEST_PLAN.filter(([ago]) => ago >= 1).slice(0, 4) : REQUEST_PLAN
    reqPlan.forEach(([ago, status, millions], k) => {
      if (ago >= spec.contractMonthsAgo) return
      const s = companyStaff[k % companyStaff.length]
      const p = plan(k)
      const date = ago === 0 ? todayISO() : monthsAgo(ago, spec.openDay)
      const decided = status === 'PENDING_MANAGER' ? null : ago === 0 ? todayISO() : monthsAgo(ago, Math.min(spec.openDay + 3, 29))
      const stage = status === 'APPROVED' ? STAGES[(k + ci) % STAGES.length] : ''
      const r: LoanRequest = {
        id: id(),
        companyId: c.id,
        staffId: s.id,
        staffName: s.fullName,
        planKey: p.key,
        planLabel: planLabel(p),
        amount: Math.round(millions * (1 + ci * 0.15)) * 1_000_000,
        paymentOrder: (k % 4) + 1,
        status,
        date,
        decidedAt: status === 'PENDING_MANAGER' || status === 'PENDING_CREDIT' ? null : decided,
        note: status === 'APPROVED' && k % 3 === 0 ? 'مدارک کامل است' : '',
        fileName: status === 'APPROVED' && k % 2 === 0 ? 'فرم-درخواست.pdf' : '',
        rejectReason: status === 'REJECTED' || status === 'REJECTED_MANAGER' ? db.settings.rejectReasons[k % db.settings.rejectReasons.length] : '',
        postStage: stage,
        noGrantReason: stage === NO_GRANT_STAGE ? db.settings.noGrantReasons[0] : '',
      }
      requests.push(r)
      log(date, '10:05', 'کارشناس شعبه دیجیتال (digital)', 'LOAN', `ثبت درخواست وام ${r.staffName} — ${faDigits((r.amount / 1e6).toLocaleString())} میلیون ریال — شرکت: ${c.name}`)
      if (status === 'REJECTED_MANAGER') log(date, '13:20', 'مدیر شرکت نمونه (manager)', 'LOAN', `رد توسط مدیر شرکت درخواست ${r.staffName} — دلیل: ${r.rejectReason}`)
      if (['PENDING_CREDIT', 'APPROVED', 'REJECTED'].includes(status))
        log(date, '13:25', 'مدیر شرکت نمونه (manager)', 'LOAN', `تأیید توسط مدیر شرکت درخواست ${r.staffName}`)
      if (status === 'APPROVED') log(decided!, '15:10', 'کارشناس اعتبارات (credit)', 'LOAN', `تأیید اعتبارات درخواست ${r.staffName} — شرکت: ${c.name}`)
      if (status === 'REJECTED') log(decided!, '15:30', 'کارشناس اعتبارات (credit)', 'LOAN', `رد اعتبارات درخواست ${r.staffName} — دلیل: ${r.rejectReason}`)
    })

    if (c.cancellation) log(c.cancellation.date, '12:00', ADMIN, 'COMPANY', `لغو قرارداد شرکت: ${c.name} — دلیل: ${c.cancellation.reason}`)
    if (c.deletedAt) log(c.deletedAt, '16:45', ADMIN, 'COMPANY', `حذف شرکت: ${c.name}`)
  })

  log(monthsAgo(2, 1), '08:30', ADMIN, 'USER', 'ثبت کاربران شعبه و شرکت (۵ کاربر)')
  log(monthsAgo(1, 2), '09:00', ADMIN, 'SETTINGS', 'ویرایش اطلاعات پایه — ۱ مورد: حداکثر تعداد طرح: 4 ← 5')

  db.companies = companies
  db.staff = staff
  db.requests = requests
  // جدیدترین رویداد اول؛ برای یک رویداد، snapshot قابل بازگردانی گذاشته می‌شود
  return audit
    .map((a, i) => ({ ...a, i }))
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : b.i - a.i))
    .map(({ i: _i, ...a }) =>
      a.category === 'SETTINGS'
        ? { ...a, snapshot: { store: 'sana', collection: 'settings', before: { ...db.settings, maxPlans: 4 } } }
        : a,
    )
}
