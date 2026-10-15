import { isActiveCompany } from '@/domain/credit'
import { eligibilityInfo, planAvailableCredit, planLabel } from '@/domain/credit'
import { NO_GRANT_STAGE, POST_APPROVAL_STAGES } from '@/domain/constants'
import { todayISO } from '@/lib/jalali'
import { rialText } from '@/lib/money'
import type { ISODate, LoanRequest, RequestStatus } from '@/types'
import { ApiError, findOr404, mutate, newId, query } from './db'

export interface NewRequestItem {
  staffId: string
  amount: number
  paymentOrder: number
}

export type DecisionAction = 'mgrApprove' | 'mgrReject' | 'approve' | 'reject'

const TRANSITIONS: Record<DecisionAction, { from: RequestStatus; to: RequestStatus; label: string }> = {
  mgrApprove: { from: 'PENDING_MANAGER', to: 'PENDING_CREDIT', label: 'تأیید توسط مدیر شرکت' },
  mgrReject: { from: 'PENDING_MANAGER', to: 'REJECTED_MANAGER', label: 'رد توسط مدیر شرکت' },
  approve: { from: 'PENDING_CREDIT', to: 'APPROVED', label: 'تأیید اعتبارات' },
  reject: { from: 'PENDING_CREDIT', to: 'REJECTED', label: 'رد اعتبارات' },
}

export const requestsApi = {
  list: (companyId?: string) =>
    query((db) => db.requests.filter((r) => !companyId || r.companyId === companyId)),

  /**
   * ثبت درخواست. همه قوانین کسب‌وکار اینجا (سمت «سرور») دوباره چک می‌شوند،
   * چون اعتبارسنجی سمت کلاینت قابل دور زدن است.
   * baseDate فقط برای تست است؛ در بک‌اند واقعی تاریخ سرور ملاک است.
   */
  create: (companyId: string, planKey: string, items: NewRequestItem[], baseDate: ISODate) =>
    mutate((db, { log }) => {
      const c = findOr404(db.companies, companyId, 'شرکت')
      if (!isActiveCompany(c)) throw new ApiError('قرارداد این شرکت فعال نیست.')
      const plan = c.plans.find((p) => p.key === planKey)
      if (!plan) throw new ApiError('طرح انتخاب‌شده در تفاهم‌نامه این شرکت نیست.')
      if (!items.length) throw new ApiError('حداقل یک پرسنل را انتخاب کنید.')
      const reqs = db.requests.filter((r) => r.companyId === companyId)
      const elig = eligibilityInfo(c, reqs, baseDate, db.settings)
      if (!elig.eligible) throw new ApiError('این شرکت هنوز مجاز به معرفی پرسنل نیست.')
      if (!elig.transferDay) throw new ApiError('امروز روز مجاز انتقال اعتبار نیست.')
      const available = planAvailableCredit(c, plan, reqs, elig, db.settings)
      const total = items.reduce((s, i) => s + i.amount, 0)
      if (items.some((i) => !(i.amount > 0))) throw new ApiError('مبلغ وام برای همه افراد باید وارد شود.')
      if (total > available)
        throw new ApiError(`مجموع درخواستی (${rialText(total)}) بیشتر از اعتبار باقی‌مانده (${rialText(available)}) است.`)

      const created = [...items]
        .sort((a, b) => a.paymentOrder - b.paymentOrder)
        .map<LoanRequest>((it) => {
          const s = findOr404(db.staff, it.staffId, 'پرسنل')
          if (s.companyId !== companyId) throw new ApiError('پرسنل متعلق به این شرکت نیست.')
          return {
            id: newId(),
            companyId,
            staffId: s.id,
            staffName: s.fullName,
            planKey,
            planLabel: planLabel(plan),
            amount: it.amount,
            paymentOrder: it.paymentOrder,
            status: 'PENDING_MANAGER',
            date: baseDate,
            decidedAt: null,
            note: '',
            fileName: '',
            rejectReason: '',
            postStage: '',
            noGrantReason: '',
          }
        })
      db.requests.push(...created)
      log('LOAN', `ثبت درخواست وام جمعاً ${rialText(total)} برای ${created.length} نفر (${created.map((r) => r.staffName).join('، ')}) — شرکت: ${c.name}`)
      return created
    }),

  decide: (
    ids: string[],
    action: DecisionAction,
    payload: { reason?: string; note?: string; fileName?: string },
  ) =>
    mutate((db, { log }) => {
      const t = TRANSITIONS[action]
      const isReject = action === 'reject' || action === 'mgrReject'
      if (isReject && !payload.reason) throw new ApiError('انتخاب دلیل رد اجباری است.')
      if (isReject && !db.settings.rejectReasons.includes(payload.reason!)) throw new ApiError('دلیل رد معتبر نیست.')
      ids.forEach((id) => {
        const r = findOr404(db.requests, id, 'درخواست')
        if (r.status !== t.from) throw new ApiError(`وضعیت درخواست ${r.staffName} تغییر کرده است؛ صفحه را تازه کنید.`, 409)
        const before = structuredClone(r)
        r.status = t.to
        r.note = payload.note ?? ''
        if (payload.fileName) r.fileName = payload.fileName
        if (isReject) r.rejectReason = payload.reason!
        r.decidedAt = todayISO()
        const company = db.companies.find((c) => c.id === r.companyId)?.name ?? ''
        log(
          'LOAN',
          `${t.label} درخواست وام ${r.staffName} — ${rialText(r.amount)} — شرکت: ${company}${payload.reason ? ' — دلیل: ' + payload.reason : ''}`,
          { entity: 'request', id, before },
        )
      })
    }),

  setPostStage: (id: string, stage: string, noGrantReason?: string) =>
    mutate((db, { log }) => {
      const r = findOr404(db.requests, id, 'درخواست')
      if (r.status !== 'APPROVED') throw new ApiError('فقط برای درخواست‌های تأییدشده مجاز است.')
      if (stage && !(POST_APPROVAL_STAGES as readonly string[]).includes(stage)) throw new ApiError('مرحله نامعتبر است.')
      if (stage === NO_GRANT_STAGE && !noGrantReason) throw new ApiError('انتخاب علت عدم اعطا اجباری است.')
      const before = structuredClone(r)
      r.postStage = stage
      r.noGrantReason = stage === NO_GRANT_STAGE ? noGrantReason! : ''
      log('LOAN', `تغییر مرحله پس از تأیید برای ${r.staffName}: ${before.postStage || '—'} ← ${stage || '—'}${r.noGrantReason ? ' — علت: ' + r.noGrantReason : ''}`, {
        entity: 'request',
        id,
        before,
      })
    }),
}
