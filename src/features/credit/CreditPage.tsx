import { Alert, Skeleton, Space, Table } from 'antd'
import { useMemo, useState } from 'react'
import { CompanySelect, KpiCard, Money, Section, StatusTag, useSelectedCompany } from '@/components/common'
import { JalaliDatePicker } from '@/components/JalaliDatePicker'
import {
  eligibilityInfo,
  lastAverage,
  planAvailableCredit,
  planCreatedCumulative,
  planDisbursed,
  planTypeLabel,
  sumAverages,
} from '@/domain/credit'
import { faDigits } from '@/lib/digits'
import { formatJalali, todayISO } from '@/lib/jalali'
import { useRequests, useSettings, useStaff } from '@/queries'
import { usePermissions } from '@/queries/auth'
import type { CompanyPlan, LoanRequest } from '@/types'
import { LoanRequestForm } from './LoanRequestForm'

export default function CreditPage() {
  const { data: settings } = useSettings()
  const { company, companyId } = useSelectedCompany()
  const { data: staff = [] } = useStaff(companyId)
  const { data: requests = [], isLoading: reqLoading } = useRequests(companyId)
  const { can } = usePermissions()
  const [baseDate, setBaseDate] = useState(todayISO())

  const elig = useMemo(
    () => (company && settings ? eligibilityInfo(company, requests, baseDate, settings) : null),
    [company, requests, baseDate, settings],
  )
  const availableByPlan = useMemo(() => {
    if (!company || !settings || !elig) return {}
    return Object.fromEntries(company.plans.map((p) => [p.key, planAvailableCredit(company, p, requests, elig, settings)]))
  }, [company, requests, elig, settings])

  if (!settings) return <Skeleton active />

  return (
    <>
      <Section>
        <Space wrap size={24} align="end">
          <CompanySelect />
          <div style={{ width: 240 }}>
            <div className="field-label">تاریخ مبنای محاسبه (پیش‌فرض: امروز)</div>
            <JalaliDatePicker value={baseDate} onChange={(d) => setBaseDate(d ?? todayISO())} />
          </div>
        </Space>
        {!company && <Alert style={{ marginTop: 16 }} type="error" title="ابتدا یک شرکت ثبت کنید." />}
        {company && elig && (
          <Space orientation="vertical" style={{ width: '100%', marginTop: 16 }}>
            {!elig.eligible ? (
              <Alert
                type="error"
                showIcon
                title={`این شرکت هنوز مجاز به معرفی پرسنل نیست — ${faDigits(settings.delay)} ماه پس از تاریخ قرارداد (${formatJalali(company.contractDate)}) مجاز می‌شود.`}
              />
            ) : !elig.transferDay ? (
              <Alert
                type="warning"
                showIcon
                title={`امروز روز مجاز انتقال اعتبار نیست. انتقال فقط در روز «${faDigits(elig.transferDayOfMonth)}» هر ماه (روز افتتاح حساب) مجاز است.`}
              />
            ) : (
              <Alert type="success" showIcon title="شرکت مجاز به ثبت درخواست وام در این ماه است." />
            )}
            {elig.usedLastMonth && (
              <Alert
                type="info"
                showIcon
                title="این شرکت در ماه گذشته از اعتبار خود استفاده کرده؛ در این ماه فقط اعتبار همین ماه قابل استفاده است و مانده انباشته قابل استفاده نیست."
              />
            )}
          </Space>
        )}
      </Section>

      {company && elig && (
        <>
          <Section title="مانده اعتبار ماه" sub="میانگین موجودی از تب «مدیریت شرکت‌ها» ثبت می‌شود.">
            <div className="kpi-grid">
              <KpiCard label="مجموع میانگین مبنای محاسبه اعتبار"><Money value={sumAverages(company)} /></KpiCard>
              <KpiCard label="میانگین ماه جاری"><Money value={lastAverage(company)} /></KpiCard>
            </div>
            <Table<CompanyPlan>
              rowKey="key"
              size="small"
              pagination={false}
              dataSource={company.plans}
              scroll={{ x: 900 }}
              columns={[
                { title: 'نوع تسهیلات', dataIndex: 'type', render: planTypeLabel },
                { title: 'نرخ', dataIndex: 'rate', render: (r) => `${faDigits(r)}٪` },
                { title: 'مدت', dataIndex: 'term', render: (t) => `${faDigits(t)} ماه` },
                { title: 'سهم از میانگین', dataIndex: 'sharePercent', render: (s: number) => `${faDigits(s.toFixed(1))}٪` },
                { title: 'درصد قابل‌استفاده', dataIndex: 'usable', render: (u) => `${faDigits(u)}٪` },
                { title: 'اعتبار ایجادشده (تجمعی)', render: (_, p) => <Money value={planCreatedCumulative(company, p, settings)} /> },
                { title: 'تخصیص‌یافته', render: (_, p) => <Money value={planDisbursed(requests, p.key)} /> },
                { title: 'مانده اعتبار ماه', render: (_, p) => <b><Money value={availableByPlan[p.key] ?? 0} /></b> },
              ]}
            />
          </Section>

          <Section
            title="ثبت درخواست تخصیص وام به پرسنل"
            sub="ابتدا طرح این ماه را انتخاب کنید، سپس پرسنل و مبلغ وام را مشخص کنید."
          >
            <LoanRequestForm
              company={company}
              staff={staff}
              requests={requests}
              availableByPlan={availableByPlan}
              baseDate={baseDate}
              canAllocate={elig.eligible && elig.transferDay}
              canSubmit={can('credit.submit')}
            />
          </Section>

          <Section title="درخواست‌های وام این شرکت">
            <Table<LoanRequest>
              rowKey="id"
              size="small"
              loading={reqLoading}
              dataSource={[...requests].reverse()}
              scroll={{ x: 800 }}
              locale={{ emptyText: 'هنوز درخواستی برای این شرکت ثبت نشده است.' }}
              columns={[
                {
                  title: 'پرسنل',
                  render: (_, r) => (
                    <>
                      {r.staffName} <span className="hint">(ترتیب: {faDigits(r.paymentOrder)})</span>
                    </>
                  ),
                },
                { title: 'طرح', dataIndex: 'planLabel' },
                { title: 'مبلغ', dataIndex: 'amount', render: (a) => <Money value={a} /> },
                { title: 'تاریخ ثبت', dataIndex: 'date', render: (d) => formatJalali(d) },
                { title: 'تاریخ تأیید/رد', dataIndex: 'decidedAt', render: (d) => formatJalali(d) },
                { title: 'وضعیت', dataIndex: 'status', render: (s) => <StatusTag status={s} /> },
              ]}
            />
          </Section>
        </>
      )}
    </>
  )
}
