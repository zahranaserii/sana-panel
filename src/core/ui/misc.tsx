import { ReloadOutlined, WarningOutlined } from '@ant-design/icons'
import { Button, Result, Skeleton, Space } from 'antd'
import { type ReactNode, useCallback, useState } from 'react'
import { usePermissions } from '../auth/hooks'
import { JalaliDatePicker } from './JalaliDatePicker'

/** نمایش children فقط با داشتن مجوز */
export function Can({ perm, children, fallback = null }: { perm: string; children: ReactNode; fallback?: ReactNode }) {
  const { can } = usePermissions()
  return <>{can(perm) ? children : fallback}</>
}

/** state باز/بسته بودن مودال/دراور همراه با داده (مثلاً آیتم در حال ویرایش) */
export function useDisclosure<T = undefined>() {
  const [state, setState] = useState<{ open: boolean; data: T | null }>({ open: false, data: null })
  const open = useCallback((data?: T) => setState({ open: true, data: data ?? null }), [])
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [])
  return { isOpen: state.open, data: state.data, open, close }
}

export function FilterBar({ children, onReset }: { children: ReactNode; onReset?: () => void }) {
  return (
    <div className="filter-bar">
      {children}
      {onReset && (
        <div>
          <Button icon={<ReloadOutlined />} onClick={onReset}>
            پاک کردن فیلترها
          </Button>
        </div>
      )}
    </div>
  )
}

export function FilterItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="filter-label">{label}</div>
      {children}
    </div>
  )
}

/** بازه تاریخ شمسی (از/تا) */
export function DateRangeFilter({
  from,
  to,
  onChange,
  labels = ['از تاریخ', 'تا تاریخ'],
}: {
  from: string | null
  to: string | null
  onChange: (from: string | null, to: string | null) => void
  labels?: [string, string]
}) {
  return (
    <>
      <FilterItem label={labels[0]}>
        <JalaliDatePicker value={from} onChange={(v) => onChange(v, to)} />
      </FilterItem>
      <FilterItem label={labels[1]}>
        <JalaliDatePicker value={to} onChange={(v) => onChange(from, v)} />
      </FilterItem>
    </>
  )
}

/** نوار چسبان ذخیره تغییرات (وقتی فرم dirty است) */
export function SaveBar({
  visible,
  onSave,
  onReset,
  saving,
  message = 'تغییرات ذخیره‌نشده دارید',
}: {
  visible: boolean
  onSave: () => void
  onReset: () => void
  saving?: boolean
  message?: string
}) {
  if (!visible) return null
  return (
    <div className="save-bar" role="status">
      <span>
        <WarningOutlined style={{ marginInlineEnd: 8, color: 'var(--c-accent)' }} />
        {message}
      </span>
      <Space>
        <Button onClick={onReset}>بازنشانی</Button>
        <Button type="primary" onClick={onSave} loading={saving} style={{ background: 'var(--c-accent)' }}>
          ذخیره تغییرات
        </Button>
      </Space>
    </div>
  )
}

export const PageSkeleton = () => (
  <div className="page">
    <Skeleton.Input active style={{ width: 240, height: 32 }} />
    <div className="section" style={{ padding: 22 }}>
      <Skeleton active paragraph={{ rows: 6 }} />
    </div>
  </div>
)

export const ForbiddenState = ({ text = 'شما به این بخش دسترسی ندارید.' }: { text?: string }) => (
  <div className="state-center">
    <Result status="403" title="دسترسی ندارید" subTitle={text} />
  </div>
)

export const ErrorState = ({ error, onRetry }: { error: unknown; onRetry?: () => void }) => (
  <Result
    status="warning"
    title="بارگذاری اطلاعات ناموفق بود"
    subTitle={error instanceof Error ? error.message : undefined}
    extra={onRetry && <Button onClick={onRetry}>تلاش مجدد</Button>}
  />
)
