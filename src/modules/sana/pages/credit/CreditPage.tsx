import { BankOutlined, CalendarOutlined, FieldTimeOutlined, WalletOutlined } from '@ant-design/icons'
import { Alert, Segmented, Space, Tooltip } from 'antd'
import { useMemo, useState } from 'react'
import { usePermissions } from '@/core'
import { faDigits } from '@/core/lib/digits'
import { formatJalali, jMonthKey, todayISO } from '@/core/lib/jalali'
import { DataTable, EmptyState, JalaliDatePicker, Money, Page, PageSkeleton, SectionCard, StatCard, StatGrid } from '@/core/ui'
import { CompanySelect, RequestStatusTag, useSelectedCompany } from '../../components'
import { STATUS_META } from '../../domain/constants'
import { eligibilityInfo, lastAverage, planAvailableCredit, planCreatedCumulative, planDisbursed, planTypeLabel, sumAverages } from '../../domain/credit'
import { useRequests, useSettings, useStaff } from '../../queries'
import type { CompanyPlan, LoanRequest, RequestStatus } from '../../types'
import { LoanRequestForm } from './LoanRequestForm'

export default function CreditPage() {
  const { data: settings } = useSettings()
  const { company, companyId } = useSelectedCompany()
  const { data: staff = [] } = useStaff(companyId)
  const { data: requests = [], isLoading: reqLoading } = useRequests(companyId)
  const { can } = usePermissions()
  const [baseDate, setBaseDate] = useState(todayISO())
  const [status, setStatus] = useState<RequestStatus | 'all'>('all')

  const elig = useMemo(() => (company && settings ? eligibilityInfo(company, requests, baseDate, settings) : null), [company, requests, baseDate, settings])
  const availableByPlan = useMemo(() => {
    if (!company || !settings || !elig) return {}
    return Object.fromEntries(company.plans.map((p) => [p.key, planAvailableCredit(company, p, requests, elig, settings)]))
  }, [company, requests, elig, settings])

  if (!settings) return <PageSkeleton />
  const thisMonth = requests.filter((r) => jMonthKey(r.date) === jMonthKey(baseDate))
  const totalAvailable = Object.values(availableByPlan).reduce((s, v) => s + v, 0)

  return (
    <Page
      actions={
        <Space wrap>
          <CompanySelect />
          <Tooltip title="تاریخ مبنای محاسبه (پیش‌فرض: امروز). فقط برای آزمایش؛ در نسخه واقعی تاریخ سرور ملاک است.">
            <div style={{ width: 190 }}>
              <JalaliDatePicker value={baseDate} onChange={(d) => setBaseDate(d ?? todayISO())} />
            </div>
          </Tooltip>
        </Space>
      }
    >
      {!company || !elig ? (
        <SectionCard>
          <EmptyState title="شرکت فعالی وجود ندارد" description="ابتدا از «مدیریت شرکت‌ها» یک شرکت ثبت کنید." />
        </SectionCard>
      ) : (
        <>
          <div className="stack" style={{ gap: 10 }}>
            {!elig.eligible ? (
              <Alert
                type="error"
                showIcon
                title="هنوز مجاز به معرفی پرسنل نیست"
                description={`${faDigits(settings.delay)} ماه پس از تاریخ قرارداد (${formatJalali(company.contractDate)}) مجاز می‌شود.`}
              />
            ) : !elig.transferDay ? (
              <Alert
                type="warning"
                showIcon
                title="امروز روز مجاز انتقال اعتبار نیست"
                description={`انتقال فقط در روز «${faDigits(elig.transferDayOfMonth)}» هر ماه (روز افتتاح حساب سپرده) مجاز است.`}
              />
            ) : (
              <Alert type="success" showIcon title="شرکت مجاز به ثبت درخواست وام در این ماه است." />
            )}
            {elig.usedLastMonth && (
              <Alert type="info" showIcon title="در ماه گذشته از اعتبار استفاده شده" description="در این ماه فقط اعتبار همین ماه قابل استفاده است و مانده انباشته ماه‌های قبل قابل استفاده نیست." />
            )}
          </div>

          <StatGrid>
            <StatCard icon={<WalletOutlined />} tone="accent" label="اعتبار قابل استفاده این ماه" value={<Money value={totalAvailable} />} />
            <StatCard icon={<BankOutlined />} label="مجموع میانگین مبنا" value={<Money value={sumAverages(company)} />} />
            <StatCard icon={<CalendarOutlined />} tone="info" label="میانگین ماه جاری" value={<Money value={lastAverage(company)} />} />
            <StatCard icon={<FieldTimeOutlined />} tone="success" label="درخواست‌های این ماه" value={`${faDigits(thisMonth.length)} مورد`} hint={`روز انتقال: ${faDigits(elig.transferDayOfMonth)} هر ماه`} />
          </StatGrid>

          <SectionCard title="اعتبار طرح‌های تفاهم‌نامه" description="اعتبار ایجادشده تجمعی، تخصیص‌یافته و مانده قابل استفاده هر طرح.">
            <DataTable<CompanyPlan>
              rowKey="key"
              data={company.plans}
              showCount={false}
              columns={[
                { title: 'طرح', render: (_, p) => <b>{planTypeLabel(p.type)} {faDigits(p.rate)}٪ — {faDigits(p.term)} ماه</b> },
                { title: 'سهم از میانگین', dataIndex: 'sharePercent', render: (s: number) => `${faDigits(s.toFixed(0))}٪` },
                { title: 'درصد قابل استفاده', dataIndex: 'usable', render: (u) => `${faDigits(u)}٪` },
                { title: 'اعتبار ایجادشده', render: (_, p) => <Money value={planCreatedCumulative(company, p, settings)} /> },
                { title: 'تخصیص‌یافته', render: (_, p) => <Money value={planDisbursed(requests, p.key)} /> },
                { title: 'مانده ماه', render: (_, p) => <Money value={availableByPlan[p.key] ?? 0} strong /> },
              ]}
            />
          </SectionCard>

          <LoanRequestForm
            company={company}
            staff={staff}
            requests={requests}
            availableByPlan={availableByPlan}
            baseDate={baseDate}
            canAllocate={elig.eligible && elig.transferDay}
            canSubmit={can('credit.submit')}
          />

          <SectionCard title="درخواست‌های وام این شرکت">
            <DataTable<LoanRequest>
              rowKey="id"
              loading={reqLoading}
              data={[...requests].filter((r) => status === 'all' || r.status === status).sort((a, b) => b.date.localeCompare(a.date))}
              searchText={(r) => `${r.staffName} ${r.planLabel}`}
              filters={
                <Segmented<RequestStatus | 'all'>
                  value={status}
                  onChange={setStatus}
                  options={[{ value: 'all', label: 'همه' }, ...(Object.keys(STATUS_META) as RequestStatus[]).map((s) => ({ value: s, label: STATUS_META[s].label }))]}
                />
              }
              empty={{ title: 'هنوز درخواستی برای این شرکت ثبت نشده است' }}
              columns={[
                { title: 'پرسنل', dataIndex: 'staffName' },
                { title: 'طرح', dataIndex: 'planLabel' },
                { title: 'مبلغ', dataIndex: 'amount', render: (a) => <Money value={a} />, sorter: (a, b) => a.amount - b.amount },
                { title: 'تاریخ ثبت', dataIndex: 'date', render: (d) => formatJalali(d) },
                { title: 'تاریخ تصمیم', dataIndex: 'decidedAt', render: (d) => formatJalali(d) },
                { title: 'وضعیت', dataIndex: 'status', render: (s) => <RequestStatusTag status={s} /> },
              ]}
            />
          </SectionCard>
        </>
      )}
    </Page>
  )
}
