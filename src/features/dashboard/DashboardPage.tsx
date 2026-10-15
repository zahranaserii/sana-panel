import { DownloadOutlined } from '@ant-design/icons'
import { Button, Col, Empty, Row, Select, Skeleton, Space, Table, Tag } from 'antd'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Can, KpiCard, Money, Section } from '@/components/common'
import { isConsuming, isPending, STATUS_META } from '@/domain/constants'
import { companyCreatedTotal, companyDisbursedTotal, contractStatus, sumAverages } from '@/domain/credit'
import { faDigits } from '@/lib/digits'
import { exportXlsx } from '@/lib/excel'
import { formatJalali, jMonthKey } from '@/lib/jalali'
import { fmt, toToman } from '@/lib/money'
import { useCompanies, useRequests, useSettings, useStaff } from '@/queries'
import type { Company, LoanRequest } from '@/types'

const C = { gold: '#C99A2E', goldD: '#8A6214', navy: '#1C4A73', danger: '#B54B3C', gray: '#5B6472' }
const PALETTE = [C.gold, C.navy, C.goldD, C.danger, C.gray]
const compact = new Intl.NumberFormat('fa-IR', { notation: 'compact', maximumFractionDigits: 1 })

type SortKey = 'avg' | 'loan' | 'count' | 'staff'

export default function DashboardPage() {
  const { data: settings } = useSettings()
  const { data: companies = [] } = useCompanies()
  const { data: requests = [] } = useRequests(null, { all: true })
  const { data: staff = [] } = useStaff(null, { all: true })
  const [month, setMonth] = useState('all')
  const [sortBy, setSortBy] = useState<SortKey>('avg')

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

  const live = companies.filter((c) => !c.deletedAt)
  const deleted = companies.filter((c) => c.deletedAt)
  const months = useMemo(() => [...new Set(requests.map((r) => jMonthKey(r.date)))].sort(), [requests])

  if (!settings) return <Skeleton active />

  const approved = requests.filter((r) => r.status === 'APPROVED')
  const pending = requests.filter((r) => isPending(r.status))
  const rejected = requests.filter((r) => !isConsuming(r.status))
  const statusData = [
    { name: 'تأییدشده', value: approved.length, color: C.gold },
    { name: 'در انتظار', value: pending.length, color: C.navy },
    { name: 'ردشده', value: rejected.length, color: C.danger },
  ].filter((d) => d.value)

  const planCounts: Record<string, number> = {}
  requests.forEach((r) => (planCounts[r.planLabel] = (planCounts[r.planLabel] ?? 0) + 1))
  const planData = Object.entries(planCounts).map(([name, value]) => ({ name, value }))

  const barData = live.map((c) => ({
    name: c.name,
    created: Math.round(companyCreatedTotal(c, settings)),
    disbursed: Math.round(companyDisbursedTotal(reqsOf(c))),
  }))

  const rankRows = live
    .map((c) => {
      const rs = reqsOf(c).filter((r) => month === 'all' || jMonthKey(r.date) === month)
      return {
        id: c.id,
        name: c.name,
        avg: sumAverages(c),
        loan: companyDisbursedTotal(rs),
        count: rs.length,
        staff: staffCount[c.id] ?? 0,
        status: contractStatus(c),
      }
    })
    .sort((a, b) => b[sortBy] - a[sortBy])

  const contractsByMonth = Object.entries(
    companies.reduce<Record<string, string[]>>((acc, c) => {
      ;(acc[jMonthKey(c.contractDate)] ??= []).push(c.name + (c.deletedAt ? ' (حذف‌شده)' : ''))
      return acc
    }, {}),
  ).sort(([a], [b]) => a.localeCompare(b))

  const perfMonths = [...new Set(requests.filter((r) => isConsuming(r.status)).map((r) => jMonthKey(r.date)))].sort()
  const perfRows = live.map((c) => {
    const row: Record<string, number | string> = { id: c.id, name: c.name }
    perfMonths.forEach((m) => {
      row[m] = companyDisbursedTotal(reqsOf(c).filter((r) => jMonthKey(r.date) === m))
    })
    return row
  })

  // ---------- خروجی‌ها ----------
  const exports = {
    companies: () =>
      exportXlsx(
        'شرکت‌ها',
        ['نام شرکت', 'شناسه ملی', 'شماره تفاهم‌نامه', 'شماره حساب', 'تاریخ قرارداد', 'روز افتتاح حساب', 'حقوق از بانک سپه', 'تعداد طرح', 'ثبت‌کننده', 'وضعیت', 'مجموع میانگین (تومان)', 'مجموع وام تخصیص‌یافته (تومان)', 'تعداد پرسنل', 'تعداد درخواست'],
        live.map((c) => [c.name, c.nationalId, c.agreementNo, c.account, formatJalali(c.contractDate, false), formatJalali(c.openDate, false), c.sepah ? 'بله' : 'خیر', c.plans.length, c.registeredBy ? `${c.registeredBy.branchName} - ${c.registeredBy.userName}` : '', contractStatus(c).text, toToman(sumAverages(c)), toToman(companyDisbursedTotal(reqsOf(c))), staffCount[c.id] ?? 0, reqsOf(c).length]),
      ),
    staff: () => {
      const names = Object.fromEntries(companies.map((c) => [c.id, c.name]))
      return exportXlsx(
        'پرسنل',
        ['شرکت', 'نام و نام خانوادگی', 'کد ملی', 'موبایل', 'کد پرسنلی', 'تاریخ استخدام', 'اولویت تخصیص'],
        staff.filter((s) => live.some((c) => c.id === s.companyId)).map((s) => [names[s.companyId], s.fullName, s.nationalCode, s.mobile, s.personnelCode, formatJalali(s.hireDate, false), s.priority]),
      )
    },
    requests: () => {
      const names = Object.fromEntries(companies.map((c) => [c.id, c.name]))
      return exportXlsx(
        'درخواست‌های-وام',
        ['شرکت', 'پرسنل', 'طرح', 'مبلغ (ریال)', 'مبلغ (تومان)', 'تاریخ ثبت', 'تاریخ تأیید/رد', 'وضعیت', 'دلیل رد', 'مرحله پس از تأیید', 'توضیحات'],
        requests.map((r) => [names[r.companyId], r.staffName, r.planLabel, r.amount, toToman(r.amount), formatJalali(r.date, false), r.decidedAt ? formatJalali(r.decidedAt, false) : '', STATUS_META[r.status].label, r.rejectReason, r.postStage, r.note]),
      )
    },
    averages: () =>
      exportXlsx(
        'میانگین‌های-ماهانه',
        ['شرکت', ...Array.from({ length: 12 }, (_, i) => `ماه ${i + 1}`)],
        live.map((c) => [c.name, ...c.monthlyAverages]),
      ),
    deleted: () =>
      exportXlsx(
        'شرکت‌های-حذف‌شده',
        ['شرکت', 'تاریخ حذف', 'مجموع میانگین (تومان)', 'مجموع وام (تومان)', 'تعداد درخواست', 'نرخ تأیید (%)'],
        deleted.map((c) => {
          const rs = reqsOf(c)
          const ok = rs.filter((r) => r.status === 'APPROVED').length
          return [c.name, formatJalali(c.deletedAt, false), toToman(sumAverages(c)), toToman(companyDisbursedTotal(rs)), rs.length, rs.length ? Math.round((ok / rs.length) * 100) : '']
        }),
      ),
  }

  return (
    <>
      <div className="kpi-grid">
        <KpiCard label="تعداد شرکت‌های فعال">{fmt(live.filter((c) => !c.cancellation).length)}</KpiCard>
        <KpiCard label="تعداد کل درخواست‌ها">{fmt(requests.length)}</KpiCard>
        <KpiCard label="جمع مبلغ تأییدشده"><Money value={approved.reduce((s, r) => s + r.amount, 0)} /></KpiCard>
        <KpiCard label="جمع مبلغ در انتظار تأیید"><Money value={pending.reduce((s, r) => s + r.amount, 0)} /></KpiCard>
      </div>

      <Row gutter={18}>
        <Col xs={24} lg={12}>
          <Section title="وضعیت درخواست‌ها" sub="نسبت درخواست‌های تأییدشده، در انتظار و ردشده">
            <PieBlock data={statusData.map((d) => ({ name: d.name, value: d.value }))} colors={statusData.map((d) => d.color)} />
          </Section>
        </Col>
        <Col xs={24} lg={12}>
          <Section title="سهم هر طرح از تعداد درخواست‌ها">
            <PieBlock data={planData} colors={PALETTE} />
          </Section>
        </Col>
      </Row>

      <Section title="اعتبار ایجادشده در مقابل تخصیص‌یافته به تفکیک شرکت">
        {barData.length ? (
          <div dir="ltr" style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={barData} margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} reversed />
                <YAxis orientation="right" tickFormatter={(v) => compact.format(v)} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${fmt(Number(v))} ریال`} />
                <Legend />
                <Bar dataKey="created" name="اعتبار ایجادشده" fill={C.gold} radius={[3, 3, 0, 0]} />
                <Bar dataKey="disbursed" name="تخصیص‌یافته" fill={C.navy} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Empty description="هنوز شرکتی ثبت نشده است." />
        )}
      </Section>

      <Section
        title="رتبه‌بندی شرکت‌ها"
        sub="با انتخاب یک ماه، ستون‌های «وام تخصیص‌یافته» و «تعداد درخواست» فقط همان ماه را نشان می‌دهند."
        extra={
          <Space wrap>
            <Select
              value={month}
              onChange={setMonth}
              style={{ minWidth: 160 }}
              options={[{ value: 'all', label: 'همه ماه‌ها (تجمعی)' }, ...months.map((m) => ({ value: m, label: faDigits(m) }))]}
            />
            <Select<SortKey>
              value={sortBy}
              onChange={setSortBy}
              style={{ minWidth: 200 }}
              options={[
                { value: 'avg', label: 'بیشترین میانگین موجودی' },
                { value: 'loan', label: 'بیشترین مبلغ وام تخصیص‌یافته' },
                { value: 'count', label: 'بیشترین تعداد درخواست' },
                { value: 'staff', label: 'بیشترین تعداد پرسنل' },
              ]}
            />
          </Space>
        }
      >
        <Table
          rowKey="id"
          size="small"
          dataSource={rankRows}
          pagination={false}
          scroll={{ x: 800 }}
          columns={[
            { title: 'رتبه', render: (_, __, i) => faDigits(i + 1), width: 60 },
            { title: 'شرکت', dataIndex: 'name' },
            { title: 'میانگین موجودی', dataIndex: 'avg', render: (v) => <Money value={v} /> },
            { title: 'وام تخصیص‌یافته', dataIndex: 'loan', render: (v) => <Money value={v} /> },
            { title: 'تعداد درخواست', dataIndex: 'count', render: fmt },
            { title: 'تعداد پرسنل', dataIndex: 'staff', render: fmt },
            { title: 'وضعیت', dataIndex: 'status', render: (s) => <Tag color={s.color}>{s.text}</Tag> },
          ]}
        />
      </Section>

      <Row gutter={18}>
        <Col xs={24} xl={10}>
          <Section title="تفاهم‌نامه‌های منعقدشده به تفکیک ماه" sub="برای سنجش عملکرد شعبه در جذب شرکت‌های جدید">
            <Table
              rowKey={(r) => r[0]}
              size="small"
              pagination={false}
              dataSource={contractsByMonth}
              columns={[
                { title: 'ماه انعقاد', render: (_, r) => faDigits(r[0]) },
                { title: 'تعداد', render: (_, r) => fmt(r[1].length) },
                { title: 'شرکت‌ها', render: (_, r) => r[1].join('، ') },
              ]}
            />
          </Section>
        </Col>
        <Col xs={24} xl={14}>
          <Section title="شرکت‌های حذف‌شده/لغوشده" sub="برای ارزیابی کیفیت همکاری">
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ x: 600 }}
              dataSource={companies.filter((c) => c.deletedAt || c.cancellation)}
              columns={[
                { title: 'شرکت', dataIndex: 'name' },
                { title: 'تاریخ', render: (_, c: Company) => formatJalali(c.deletedAt ?? c.cancellation?.date) },
                { title: 'وضعیت', render: (_, c: Company) => <Tag color={contractStatus(c).color}>{contractStatus(c).text}</Tag> },
                { title: 'مجموع وام', render: (_, c: Company) => <Money value={companyDisbursedTotal(reqsOf(c))} /> },
                {
                  title: 'نرخ تأیید',
                  render: (_, c: Company) => {
                    const rs = reqsOf(c)
                    return rs.length ? `${faDigits(Math.round((rs.filter((r) => r.status === 'APPROVED').length / rs.length) * 100))}٪` : '—'
                  },
                },
              ]}
            />
          </Section>
        </Col>
      </Row>

      <Section title="عملکرد ماهانه شرکت‌ها (مبلغ وام تخصیص‌یافته)">
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: 'max-content' }}
          dataSource={perfRows}
          locale={{ emptyText: 'هنوز داده کافی برای این گزارش وجود ندارد.' }}
          columns={[
            { title: 'شرکت', dataIndex: 'name', fixed: 'right' },
            ...perfMonths.map((m) => ({
              title: faDigits(m),
              dataIndex: m,
              render: (v: number) => (v ? <Money value={v} /> : '—'),
            })),
          ]}
        />
      </Section>

      <Can perm="dash.export">
        <Section title="گزارش‌های خروجی (Excel)" sub="هر فایل شامل جزئیات کامل آن بخش است و مستقیماً در Excel باز می‌شود.">
          <Space wrap>
            <Button icon={<DownloadOutlined />} onClick={exports.companies}>خروجی شرکت‌ها</Button>
            <Button icon={<DownloadOutlined />} onClick={exports.staff}>خروجی پرسنل</Button>
            <Button icon={<DownloadOutlined />} onClick={exports.requests}>خروجی درخواست‌های وام</Button>
            <Button icon={<DownloadOutlined />} onClick={exports.averages}>خروجی میانگین‌های ماهانه</Button>
            <Button icon={<DownloadOutlined />} onClick={exports.deleted}>خروجی شرکت‌های حذف‌شده</Button>
          </Space>
        </Section>
      </Can>
    </>
  )
}

function PieBlock({ data, colors }: { data: { name: string; value: number }[]; colors: string[] }) {
  if (!data.length) return <Empty description="هنوز درخواستی ثبت نشده است." />
  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={data.length > 1 ? 2 : 0}>
            {data.map((d, i) => (
              <Cell key={d.name} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => fmt(Number(v))} />
          <Legend formatter={(v, e) => `${v} (${fmt((e.payload as { value?: number } | undefined)?.value ?? 0)})`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

