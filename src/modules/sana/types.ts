import type { ISODate } from '@/core/lib/jalali'

export type { ISODate }

export interface Settings {
  /** نرخ قرض‌الحسنه (درصد) */
  qarzRate: number
  /** آیا ضریب حقوق‌بگیر بانک سپه اعمال شود */
  sepahEnabled: boolean
  /** ضریب تأثیر حقوق‌بگیر بانک سپه */
  multYes: number
  /** مدت قرارداد (سال) */
  years: number
  /** مهلت استفاده از مانده اعتبار پس از انقضا (ماه) */
  grace: number
  /** حداکثر تعداد طرح قابل انتخاب برای هر شرکت */
  maxPlans: number
  /** مهلت مجاز شدن معرفی پرسنل پس از انعقاد قرارداد (ماه) */
  delay: number
  murRates: number[]
  terms: number[]
  /**
   * درصد قابل استفاده از میانگین.
   * usable[termIndex][0] = قرض‌الحسنه، usable[termIndex][i + 1] = مرابحه با نرخ murRates[i]
   */
  usable: number[][]
  cancelReasons: string[]
  rejectReasons: string[]
  noGrantReasons: string[]
  avgDocTypes: string[]
}

export type PlanType = 'QARZ' | 'MURABAHA'

export interface PlanOption {
  key: string
  type: PlanType
  rate: number
  term: number
  usable: number
}

export interface CompanyPlan extends PlanOption {
  sharePercent: number
}

export interface UserStamp {
  userName: string
  userCode: string
  branchName: string
  branchCode: string
}

export interface AvgDoc {
  id: string
  date: ISODate
  months: number[]
  type: string
  fileName: string
  note: string
  user: string
}

export interface Cancellation {
  date: ISODate
  reason: string
  note: string
  fileName: string
}

export interface Company {
  id: string
  name: string
  nationalId: string
  agreementNo: string
  account: string
  contractDate: ISODate
  openDate: ISODate
  sepah: boolean
  agreementFile: string
  plans: CompanyPlan[]
  /** ۱۲ ماه سال جاری قرارداد؛ null یعنی ثبت نشده */
  monthlyAverages: (number | null)[]
  avgDocs: AvgDoc[]
  registeredBy: UserStamp | null
  createdAt: string
  cancellation: Cancellation | null
  deletedAt: ISODate | null
}

export interface Staff {
  id: string
  companyId: string
  fullName: string
  nationalCode: string
  mobile: string
  personnelCode: string
  hireDate: ISODate | null
  priority: number
}

export type RequestStatus =
  | 'PENDING_MANAGER'
  | 'REJECTED_MANAGER'
  | 'PENDING_CREDIT'
  | 'APPROVED'
  | 'REJECTED'

export interface LoanRequest {
  id: string
  companyId: string
  staffId: string
  staffName: string
  planKey: string
  planLabel: string
  amount: number
  paymentOrder: number
  status: RequestStatus
  date: ISODate
  decidedAt: ISODate | null
  note: string
  fileName: string
  rejectReason: string
  postStage: string
  noGrantReason: string
}
