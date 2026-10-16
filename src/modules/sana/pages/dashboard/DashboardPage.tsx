import { BankOutlined, CheckCircleOutlined, ClockCircleOutlined, FileDoneOutlined, TrophyOutlined } from '@ant-design/icons'
import { Col, Row, Segmented, Select, Space, Tag } from 'antd'
import { useMemo, useState } from 'react'
import { usePermissions } from '@/core'
import { faDigits } from '@/core/lib/digits'
import { formatJalali, jMonthKey } from '@/core/lib/jalali'
import { fmt, toToman } from '@/core/lib/money'
import { DataTable, ExportButton, Money, Page, PageSkeleton, SectionCard, StatCard, StatGrid } from '@/core/ui'
import { BarChartBlock, DonutChart } from '@/core/ui/charts'
import { ContractStatusTag } from '../../components'
import { isConsuming, isPending, STATUS_META } from '../../domain/constants'
import { companyCreatedTotal, companyDisbursedTotal, contractStatus, sumAverages } from '../../domain/credit'
import { useCompanies, useRequests, useSettings, useStaff } from '../../queries'
import type { Company, LoanRequest } from '../../types'

type SortKey = 'avg' | 'loan' | 'count' | 'staff'

export default function DashboardPage() {
  const { data: settings } = useSettings()
  const { data: companies = [] } = useCompanies()
  const { data: requests = [] } = useRequests(null, { all: true })
  const { data: staff = [] } = useStaff(null, { all: true })
  const { can } = usePermissions()
  const [month, setMonth] = useState('all')
  const [sortBy, setSortBy] = useState<SortKey>('loan')

  const byCompany = useMemo(() => {
    const m: Record<string, LoanRequest[]> = {}
    requests.forEach((r) => (m[r.companyId] ??= []).push(r))
    return m
  }, [requests])
  const reqsOf = (c: Company) => byCompany[c.id] ?? []
  const staffCount = useMemo(() => {
    const m: Record<string, number> = {}
    staff.forEach((s) => (m[s.companyId] = (m[s.companyId] ?? 0) + 1))
    return m
  }, [staff])
  const months = useMemo(() => [...new Set(requests.map((r) => jMonthKey(r.date)))].sort(), [requests])

  if (!settings) return <PageSkeleton />

  const live = companies.filter((c) => !c.deletedAt)
  const activeCount = live.filter((c) => contractStatus(c).active).length
  const approved = requests.filter((r) => r.status === 'APPROVED')
  const pending = requests.filter((r) => isPending(r.status))
  const sum = (l: LoanRequest[]) => l.reduce((s, r) => s + r.amount, 0)

  const statusData = [
    { name: STATUS_META.APPROVED.label, value: approved.length, color: '#12805C' },
    { name: STATUS_META.PENDING_CREDIT.label, value: requests.filter((r) => r.status === 'PENDING_CREDIT').length, color: '#1C4A73' },
    { name: STATUS_META.PENDING_MANAGER.label, value: requests.filter((r) => r.status === 'PENDING_MANAGER').length, color: '#C99A2E' },
    { name: 'ردشده', value: requests.filter((r) => !isConsuming(r.status)).length, color: '#B54B3C' },
  ]
  const planCounts: Record<string, number> = {}
  requests.forEach((r) => (planCounts[r.planLabel] = (planCounts[r.planLabel] ?? 0) + 1))

  const rankRows = live
    .map((c) => {
      const rs = reqsOf(c).filter((r) => month === 'all' || jMonthKey(r.date) === month)
      return { id: c.id, company: c, name: c.name, avg: sumAverages(c), loan: companyDisbursedTotal(rs), count: rs.length, staff: staffCount[c.id] ?? 0 }
    })
    .sort((a, b) => b[sortBy] - a[sortBy])

  const contractsByMonth = Object.entries(
    companies.reduce<Record<string, string[]>>((acc, c) => {
      ;(acc[jMonthKey(c.contractDate)] ??= []).push(c.name + (c.deletedAt ? ' (حذف‌شده)' : ''))
      return acc
    }, {}),
  )
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([m, names]) => ({ m, names }))

  const perfMonths = [...new Set(requests.filter((r) => isConsuming(r.status)).map((r) => jMonthKey(r.date)))].sort()
  const perfRows = live.map((c) => ({
    id: c.id,
    name: c.name,
    ...Object.fromEntries(perfMonths.map((m) => [m, companyDisbursedTotal(reqsOf(c).filter((r) => jMonthKey(r.date) === m))])),
  })) as ({ id: string; name: string } & Record<string, number>)[]

  const ended = companies.filter((c) => c.deletedAt || c.cancellation)
  const names = Object.fromEntries(companies.map((c) => [c.id, c.name]))

  return (
    <Page
      actions={
        can('dash.export') && (
          <Space wrap>
            <ExportButton
              label="خروجی درخواست‌ها"
              filename="درخواست‌های-وام"
              headers={['شرکت', 'پرسنل', 'طرح', 'مبلغ (ریال)', 'تاریخ ثبت', 'وضعیت', 'مرحله']}
              rows={() => requests.map((r) => [names[r.companyId], r.staffName, r.planLabel, r.amount, formatJalali(r.date, false), STATUS_META[r.status].label, r.postStage])}
            />
            <ExportButton
              label="خروجی شرکت‌ها"
              filename="شرکت‌ها"
              headers={['نام شرکت', 'شناسه ملی', 'تاریخ قرارداد', 'وضعیت', 'مجموع میانگین (تومان)', 'مجموع وام (تومان)', 'پرسنل', 'درخواست']}
              rows={() => live.map((c) => [c.name, c.nationalId, formatJalali(c.contractDate, false), contractStatus(c).text, toToman(sumAverages(c)), toToman(companyDisbursedTotal(reqsOf(c))), staffCount[c.id] ?? 0, reqsOf(c).length])}
            />
          </Space>
        )
      }
    >
      <StatGrid>
        <StatCard icon={<BankOutlined />} label="شرکت‌های فعال" value={faDigits(activeCount)} hint={`از ${faDigits(live.length)} شرکت ثبت‌شده`} />
        <StatCard icon={<FileDoneOutlined />} tone="info" label="کل درخواست‌ها" value={faDigits(requests.length)} hint={`${faDigits(staff.length)} پرسنل در سامانه`} />
        <StatCard icon={<CheckCircleOutlined />} tone="success" label="جمع تأییدشده" value={<Money value={sum(approved)} />} />
        <StatCard icon={<ClockCircleOutlined />} tone="accent" label="جمع در انتظار تأیید" value={<Money value={sum(pending)} />} hint={`${faDigits(pending.length)} درخواست`} />
      </StatGrid>

      <Row gutter={[18, 18]}>
        <Col xs={24} xl={12}>
          <SectionCard title="وضعیت درخواست‌ها">
            <DonutChart data={statusData} centerLabel="درخواست" />
          </SectionCard>
        </Col>
        <Col xs={24} xl={12}>
          <SectionCard title="سهم هر طرح از درخواست‌ها">
            <DonutChart data={Object.entries(planCounts).map(([name, value]) => ({ name, value }))} centerLabel="درخواست" />
          </SectionCard>
        </Col>
      </Row>

      <SectionCard title="اعتبار ایجادشده در برابر تخصیص‌یافته" description="به تفکیک شرکت (ریال)">
        <BarChartBlock
          data={live.map((c) => ({ name: c.name, created: Math.round(companyCreatedTotal(c, settings)), disbursed: Math.round(companyDisbursedTotal(reqsOf(c))) }))}
          xKey="name"
          valueSuffix=" ریال"
          series={[
            { key: 'created', name: 'اعتبار ایجادشده', color: '#C99A2E' },
            { key: 'disbursed', name: 'تخصیص‌یافته', color: '#1C4A73' },
          ]}
        />
      </SectionCard>

      <SectionCard
        title="رتبه‌بندی شرکت‌ها"
        icon={<TrophyOutlined />}
        description="با انتخاب یک ماه، «وام تخصیص‌یافته» و «تعداد درخواست» فقط همان ماه را نشان می‌دهند."
        extra={
          <Space wrap>
            <Select value={month} onChange={setMonth} style={{ minWidth: 150 }} options={[{ value: 'all', label: 'همه ماه‌ها' }, ...months.map((m) => ({ value: m, label: faDigits(m) }))]} />
            <Segmented<SortKey>
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: 'loan', label: 'وام' },
                { value: 'avg', label: 'میانگین' },
                { value: 'count', label: 'درخواست' },
                { value: 'staff', label: 'پرسنل' },
              ]}
            />
          </Space>
        }
      >
        <DataTable
          rowKey="id"
          data={rankRows}
          showCount={false}
          columns={[
            {
              title: 'رتبه',
              width: 70,
              align: 'center',
              render: (_, __, i) => <span className={`rank rank-${i + 1}`}>{faDigits(i + 1)}</span>,
            },
            { title: 'شرکت', dataIndex: 'name', render: (n) => <b>{n}</b> },
            { title: 'میانگین موجودی', dataIndex: 'avg', render: (v) => <Money value={v} /> },
            { title: 'وام تخصیص‌یافته', dataIndex: 'loan', render: (v) => <Money value={v} /> },
            { title: 'درخواست', dataIndex: 'count', render: fmt, align: 'center' },
            { title: 'پرسنل', dataIndex: 'staff', render: fmt, align: 'center' },
            { title: 'وضعیت', render: (_, r) => <ContractStatusTag company={r.company} /> },
          ]}
        />
      </SectionCard>

      <SectionCard title="عملکرد ماهانه (مبلغ وام تخصیص‌یافته)">
        <DataTable
          rowKey="id"
          data={perfRows}
          showCount={false}
          empty={{ title: 'هنوز داده کافی وجود ندارد' }}
          columns={[
            { title: 'شرکت', dataIndex: 'name', fixed: 'start', render: (n) => <b>{n}</b> },
            ...perfMonths.map((m) => ({ title: faDigits(m), dataIndex: m, render: (v: number) => (v ? <Money value={v} /> : <span className="faint">—</span>) })),
          ]}
        />
      </SectionCard>

      <Row gutter={[18, 18]}>
        <Col xs={24} xl={10}>
          <SectionCard title="تفاهم‌نامه‌ها به تفکیک ماه" description="برای سنجش عملکرد شعبه در جذب شرکت‌های جدید">
            <DataTable
              rowKey="m"
              data={contractsByMonth}
              showCount={false}
              columns={[
                { title: 'ماه', dataIndex: 'm', render: (m) => <b className="num">{faDigits(m)}</b> },
                { title: 'تعداد', render: (_, r) => <Tag>{faDigits(r.names.length)}</Tag> },
                { title: 'شرکت‌ها', render: (_, r) => r.names.join('، ') },
              ]}
            />
          </SectionCard>
        </Col>
        <Col xs={24} xl={14}>
          <SectionCard title="شرکت‌های حذف‌شده و لغوشده" description="برای ارزیابی کیفیت همکاری">
            <DataTable<Company>
              rowKey="id"
              data={ended}
              showCount={false}
              empty={{ title: 'شرکت حذف‌شده یا لغوشده‌ای وجود ندارد' }}
              columns={[
                { title: 'شرکت', dataIndex: 'name', render: (n) => <b>{n}</b> },
                { title: 'تاریخ', render: (_, c) => formatJalali(c.deletedAt ?? c.cancellation?.date) },
                { title: 'وضعیت', render: (_, c) => <ContractStatusTag company={c} /> },
                { title: 'مجموع وام', render: (_, c) => <Money value={companyDisbursedTotal(reqsOf(c))} /> },
                {
                  title: 'نرخ تأیید',
                  render: (_, c) => {
                    const rs = reqsOf(c)
                    return rs.length ? `${faDigits(Math.round((rs.filter((r) => r.status === 'APPROVED').length / rs.length) * 100))}٪` : '—'
                  },
                },
              ]}
            />
          </SectionCard>
        </Col>
      </Row>
    </Page>
  )
}
