/**
 * نمودارهای عمومی روی Recharts.
 * عمداً در barrel (core/ui/index) نیست تا Recharts فقط در صفحاتی که نمودار دارند لود شود:
 *   import { DonutChart } from '@/core/ui/charts'
 */
import { Bar, BarChart as RBarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmt } from '../lib/money'
import { EmptyState } from './display'

export const CHART_PALETTE = ['#C99A2E', '#1C4A73', '#12805C', '#B54B3C', '#6941C6', '#5B6472', '#8A6214']
const compact = new Intl.NumberFormat('fa-IR', { notation: 'compact', maximumFractionDigits: 1 })

export interface Slice {
  name: string
  value: number
  color?: string
}

/** نمودار دونات با عدد کل در مرکز و راهنمای قابل‌خواندن */
export function DonutChart({ data, height = 240, centerLabel = 'مجموع' }: { data: Slice[]; height?: number; centerLabel?: string }) {
  const items = data.filter((d) => d.value > 0)
  if (!items.length) return <EmptyState title="هنوز داده‌ای وجود ندارد" />
  const total = items.reduce((s, d) => s + d.value, 0)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
      <div style={{ width: height, height, position: 'relative' }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={items} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={items.length > 1 ? 2 : 0} stroke="none">
              {items.map((d, i) => (
                <Cell key={d.name} fill={d.color ?? CHART_PALETTE[i % CHART_PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => fmt(Number(v))} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(total)}</div>
            <div className="hint">{centerLabel}</div>
          </div>
        </div>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8, minWidth: 160 }}>
        {items.map((d, i) => (
          <li key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color ?? CHART_PALETTE[i % CHART_PALETTE.length], flex: 'none' }} />
            <span style={{ flex: 1 }}>{d.name}</span>
            <b className="num">{fmt(d.value)}</b>
            <span className="faint num" style={{ width: 42, textAlign: 'left' }}>{fmt(Math.round((d.value / total) * 100))}٪</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export interface BarSeries {
  key: string
  name: string
  color?: string
}

/** نمودار میله‌ای گروهی */
export function BarChartBlock<T extends Record<string, unknown>>({
  data,
  xKey,
  series,
  height = 300,
  valueSuffix = '',
}: {
  data: T[]
  xKey: keyof T & string
  series: BarSeries[]
  height?: number
  valueSuffix?: string
}) {
  if (!data.length) return <EmptyState title="هنوز داده‌ای وجود ندارد" />
  return (
    <div dir="ltr" className="chart-wrap" style={{ height }}>
      <ResponsiveContainer>
        <RBarChart data={data} margin={{ left: 8, right: 8, top: 8 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAECF0" />
          <XAxis dataKey={xKey as string} tick={{ fontSize: 11, fill: '#667085' }} reversed tickLine={false} axisLine={{ stroke: '#EAECF0' }} />
          <YAxis orientation="right" tickFormatter={(v) => compact.format(v)} tick={{ fontSize: 11, fill: '#667085' }} tickLine={false} axisLine={false} width={64} />
          <Tooltip formatter={(v) => `${fmt(Number(v))}${valueSuffix}`} cursor={{ fill: 'rgba(16,24,40,.04)' }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color ?? CHART_PALETTE[i % CHART_PALETTE.length]} radius={[6, 6, 0, 0]} maxBarSize={44} />
          ))}
        </RBarChart>
      </ResponsiveContainer>
    </div>
  )
}
