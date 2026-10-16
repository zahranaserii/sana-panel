import { InboxOutlined } from '@ant-design/icons'
import { Skeleton, Tag, Tooltip } from 'antd'
import type { CSSProperties, ReactNode } from 'react'
import { fmt, toToman, tomanWords } from '../lib/money'

export type Tone = 'primary' | 'accent' | 'success' | 'danger' | 'info' | 'warning'

interface StatCardProps {
  label: ReactNode
  value: ReactNode
  icon?: ReactNode
  tone?: Tone
  hint?: ReactNode
  loading?: boolean
}

/** کارت شاخص (KPI) */
export function StatCard({ label, value, icon, tone = 'primary', hint, loading }: StatCardProps) {
  return (
    <div className="stat">
      {icon && <div className={`stat-icon tone-${tone}`}>{icon}</div>}
      <div className="stat-body">
        <div className="stat-label">{label}</div>
        {loading ? <Skeleton.Input active size="small" /> : <div className="stat-value num">{value}</div>}
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </div>
  )
}

export const StatGrid = ({ children, min = 220 }: { children: ReactNode; min?: number }) => (
  <div className="stat-grid" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))` }}>
    {children}
  </div>
)

/** مبلغ ریالی + معادل تومان؛ با hover مبلغ به حروف */
export function Money({ value, inline, strong }: { value: number; inline?: boolean; strong?: boolean }) {
  const main = <span className="num" style={strong ? { fontWeight: 800 } : undefined}>{fmt(value)} ریال</span>
  if (inline) return main
  return (
    <Tooltip title={value ? tomanWords(value) : undefined}>
      <span className="money">
        {main}
        <span className="money-sub num">{fmt(toToman(value))} تومان</span>
      </span>
    </Tooltip>
  )
}

export interface StatusMeta {
  label: string
  color: string
}

/** نشان وضعیت عمومی؛ map وضعیت‌ها را هر ماژول خودش تعریف می‌کند */
export function StatusBadge({ meta }: { meta: StatusMeta | undefined }) {
  if (!meta) return <Tag>—</Tag>
  return (
    <Tag color={meta.color} variant="filled" style={{ fontWeight: 600, borderRadius: 999, paddingInline: 10 }}>
      {meta.label}
    </Tag>
  )
}

/** ساخت کامپوننت وضعیت از روی یک map: `const RequestStatus = createStatusBadge(STATUS_META)` */
export function createStatusBadge<K extends string>(map: Record<K, StatusMeta>) {
  return function Badge({ status }: { status: K }) {
    return <StatusBadge meta={map[status]} />
  }
}

interface EmptyStateProps {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  icon?: ReactNode
}

export function EmptyState({ title = 'موردی یافت نشد', description, action, icon }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon ?? <InboxOutlined />}</div>
      <div className="empty-title">{title}</div>
      {description && <div className="hint">{description}</div>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  )
}

/** فهرست کلید/مقدار */
export function InfoList({ items, min = 180 }: { items: { label: ReactNode; value: ReactNode }[]; min?: number }) {
  return (
    <dl className="info-list" style={{ ['--min' as string]: `${min}px` }}>
      {items.map((it, i) => (
        <div key={i}>
          <dt>{it.label}</dt>
          <dd>{it.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

const AVATAR_COLORS = ['#0E2B47', '#17406A', '#8A6214', '#12805C', '#6941C6', '#B54708', '#1D4ED8']

export function Avatar({ name, size = 36, style }: { name: string; size?: number; style?: CSSProperties }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('‌')
  const color = AVATAR_COLORS[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length]
  return (
    <span className="avatar" style={{ width: size, height: size, background: color, fontSize: size * 0.38, ...style }}>
      {initials}
    </span>
  )
}
