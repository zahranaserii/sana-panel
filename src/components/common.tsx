import { Card, Select, Tag, Typography } from 'antd'
import type { CardProps } from 'antd'
import type { ReactNode } from 'react'
import { STATUS_META } from '@/domain/constants'
import { fmt, toToman } from '@/lib/money'
import { usePermissions } from '@/queries/auth'
import type { RequestStatus } from '@/types'
import { useSelectedCompany } from './useSelectedCompany'

export { useSelectedCompany }

export function Money({ value, inline }: { value: number; inline?: boolean }) {
  if (inline) return <span>{fmt(value)} ریال</span>
  return (
    <span className="money">
      {fmt(value)} ریال
      <span className="money-toman">({fmt(toToman(value))} تومان)</span>
    </span>
  )
}

export function StatusTag({ status }: { status: RequestStatus }) {
  const m = STATUS_META[status]
  return <Tag color={m.color}>{m.label}</Tag>
}

export function Section({ title, sub, children, ...rest }: CardProps & { sub?: ReactNode }) {
  return (
    <Card className="section" title={title} {...rest}>
      {sub && <Typography.Paragraph type="secondary" style={{ marginTop: -4 }}>{sub}</Typography.Paragraph>}
      {children}
    </Card>
  )
}

export function KpiCard({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{children}</div>
    </div>
  )
}

/** نمایش children فقط در صورت داشتن مجوز */
export function Can({ perm, children }: { perm: string; children: ReactNode }) {
  const { can } = usePermissions()
  return can(perm) ? <>{children}</> : null
}

export function CompanySelect({ style }: { style?: React.CSSProperties }) {
  const { companyId, active, setSelectedId, isLoading } = useSelectedCompany()
  return (
    <div style={{ maxWidth: 360, ...style }}>
      <div className="field-label">انتخاب شرکت</div>
      <Select
        style={{ width: '100%' }}
        loading={isLoading}
        value={companyId ?? undefined}
        onChange={setSelectedId}
        placeholder="ابتدا یک شرکت ثبت کنید"
        showSearch={{ optionFilterProp: 'label' }}
        options={active.map((c) => ({ value: c.id, label: c.name }))}
      />
    </div>
  )
}
