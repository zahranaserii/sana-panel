import { buildPlanMatrix } from '@/domain/credit'
import { todayISO } from '@/lib/jalali'
import type { Cancellation, Company, ISODate } from '@/types'
import { ApiError, findOr404, mutate, newId, query } from './db'

export interface CompanyInput {
  name: string
  nationalId: string
  agreementNo: string
  account: string
  contractDate: ISODate
  openDate: ISODate
  sepah: boolean
  /** نام فایل؛ در API واقعی فایل با multipart آپلود و شناسه آن برگردانده می‌شود */
  agreementFile?: string
  planKeys: string[]
}

export interface AveragesInput {
  monthlyAverages: (number | null)[]
  docType: string
  fileName: string
  note: string
}

export const companiesApi = {
  list: () => query((db) => db.companies),

  create: (input: CompanyInput) =>
    mutate((db, { actor, log }) => {
      assertUniqueNid(db.companies, input.nationalId)
      const c: Company = {
        id: newId(),
        ...toFields(input, db.settings),
        agreementFile: input.agreementFile ?? '',
        monthlyAverages: Array(12).fill(null),
        avgDocs: [],
        registeredBy: {
          userName: actor.fullName,
          userCode: actor.userCode,
          branchName: actor.branchName,
          branchCode: actor.branchCode,
        },
        createdAt: new Date().toISOString(),
        cancellation: null,
        deletedAt: null,
      }
      db.companies.push(c)
      log('COMPANY', `ثبت شرکت جدید: ${c.name}`)
      return c
    }),

  update: (id: string, input: CompanyInput) =>
    mutate((db, { log }) => {
      const c = findOr404(db.companies, id, 'شرکت')
      assertUniqueNid(db.companies, input.nationalId, id)
      const before = structuredClone(c)
      Object.assign(c, toFields(input, db.settings))
      if (input.agreementFile) c.agreementFile = input.agreementFile
      log('COMPANY', `ویرایش اطلاعات شرکت: ${c.name}`, { entity: 'company', id, before })
      return c
    }),

  cancel: (id: string, data: Cancellation) =>
    mutate((db, { log }) => {
      const c = findOr404(db.companies, id, 'شرکت')
      if (!db.settings.cancelReasons.includes(data.reason)) throw new ApiError('دلیل لغو معتبر نیست.')
      const before = structuredClone(c)
      c.cancellation = data
      log('COMPANY', `لغو قرارداد شرکت: ${c.name} — دلیل: ${data.reason}${data.note ? ' — ' + data.note : ''}`, {
        entity: 'company',
        id,
        before,
      })
    }),

  remove: (id: string) =>
    mutate((db, { log }) => {
      const c = findOr404(db.companies, id, 'شرکت')
      const before = structuredClone(c)
      c.deletedAt = todayISO()
      log('COMPANY', `حذف شرکت: ${c.name}`, { entity: 'company', id, before })
    }),

  saveAverages: (id: string, input: AveragesInput) =>
    mutate((db, { actor, log }) => {
      const c = findOr404(db.companies, id, 'شرکت')
      if (!db.settings.avgDocTypes.includes(input.docType)) throw new ApiError('نوع مستند معتبر نیست.')
      if (!input.fileName) throw new ApiError('بارگذاری فایل مستند اجباری است.')
      const changed = input.monthlyAverages
        .map((v, i) => ((c.monthlyAverages[i] ?? null) !== (v ?? null) ? i + 1 : 0))
        .filter(Boolean)
      if (!changed.length) throw new ApiError('تغییری در میانگین‌ها ایجاد نشده است.')
      const before = structuredClone(c)
      c.monthlyAverages = input.monthlyAverages
      c.avgDocs.push({
        id: newId(),
        date: todayISO(),
        months: changed,
        type: input.docType,
        fileName: input.fileName,
        note: input.note,
        user: actor.fullName,
      })
      log('COMPANY', `ثبت/ویرایش میانگین موجودی (ماه‌های ${changed.join('، ')}) با مستند «${input.docType}»: ${c.name}`, {
        entity: 'company',
        id,
        before,
      })
    }),
}

function assertUniqueNid(list: Company[], nid: string, exceptId?: string) {
  if (list.some((c) => c.nationalId === nid && c.id !== exceptId && !c.deletedAt))
    throw new ApiError('شرکتی با این شناسه ملی قبلاً ثبت شده است.', 409)
}

function toFields(input: CompanyInput, settings: Parameters<typeof buildPlanMatrix>[0]) {
  const matrix = buildPlanMatrix(settings)
  const chosen = matrix.filter((p) => input.planKeys.includes(p.key))
  if (!chosen.length) throw new ApiError('حداقل یک طرح باید انتخاب شود.')
  if (chosen.length > settings.maxPlans) throw new ApiError(`حداکثر ${settings.maxPlans} طرح قابل انتخاب است.`)
  return {
    name: input.name,
    nationalId: input.nationalId,
    agreementNo: input.agreementNo,
    account: input.account,
    contractDate: input.contractDate,
    openDate: input.openDate,
    sepah: input.sepah,
    plans: chosen.map((p) => ({ ...p, sharePercent: 100 / chosen.length })),
  }
}
