import { DownloadOutlined, MoreOutlined, UploadOutlined } from '@ant-design/icons'
import { Button, Dropdown, Popconfirm, Space, Tooltip, Upload } from 'antd'
import type { ButtonProps } from 'antd'
import { type ReactNode, useState } from 'react'
import { exportXlsx } from '../lib/excel'
import { notify } from './feedback'

export interface RowAction {
  key: string
  label: string
  icon?: ReactNode
  onClick: () => void
  danger?: boolean
  primary?: boolean
  /** متن تأیید (Popconfirm) قبل از اجرا */
  confirm?: string
  hidden?: boolean
  disabled?: boolean
  tooltip?: string
}

/**
 * اکشن‌های هر ردیف جدول: چند مورد اول به‌صورت دکمه، بقیه در منوی «…».
 * اکشن‌های hidden (مثلاً بدون مجوز) خودکار حذف می‌شوند.
 */
export function RowActions({ actions, max = 2 }: { actions: RowAction[]; max?: number }) {
  const visible = actions.filter((a) => !a.hidden)
  if (!visible.length) return <span className="faint">—</span>
  const inline = visible.length <= max + 1 ? visible : visible.slice(0, max)
  const rest = visible.length <= max + 1 ? [] : visible.slice(max)
  return (
    <Space size={4} onClick={(e) => e.stopPropagation()}>
      {inline.map((a) => (
        <ActionButton key={a.key} action={a} />
      ))}
      {rest.length > 0 && (
        <Dropdown
          trigger={['click']}
          menu={{
            items: rest.map((a) => ({ key: a.key, label: a.label, icon: a.icon, danger: a.danger, disabled: a.disabled })),
            onClick: ({ key }) => rest.find((a) => a.key === key)?.onClick(),
          }}
        >
          <Button size="small" type="text" icon={<MoreOutlined />} aria-label="اکشن‌های بیشتر" />
        </Dropdown>
      )}
    </Space>
  )
}

function ActionButton({ action: a }: { action: RowAction }) {
  const btn = (
    <Button
      size="small"
      type={a.primary ? 'primary' : 'default'}
      danger={a.danger}
      icon={a.icon}
      disabled={a.disabled}
      onClick={a.confirm ? undefined : a.onClick}
    >
      {a.label}
    </Button>
  )
  const withTip = a.tooltip ? <Tooltip title={a.tooltip}>{btn}</Tooltip> : btn
  if (!a.confirm) return withTip
  return (
    <Popconfirm title={a.confirm} okText="بله" cancelText="خیر" okButtonProps={{ danger: a.danger }} onConfirm={a.onClick}>
      {withTip}
    </Popconfirm>
  )
}

/** دکمه با تأیید (برای حذف و عملیات برگشت‌ناپذیر) */
export function ConfirmButton({ confirm, onConfirm, ...props }: ButtonProps & { confirm: string; onConfirm: () => void }) {
  return (
    <Popconfirm title={confirm} okText="بله" cancelText="خیر" okButtonProps={{ danger: props.danger }} onConfirm={onConfirm}>
      <Button {...props} />
    </Popconfirm>
  )
}

/** نوار عملیات گروهی؛ وقتی چند ردیف انتخاب شده نمایش داده می‌شود */
export function BulkBar({ count, onClear, children }: { count: number; onClear: () => void; children: ReactNode }) {
  if (!count) return null
  return (
    <div className="bulk-bar" role="region" aria-label="عملیات گروهی">
      <span>
        <b>{count.toLocaleString('fa-IR')}</b> مورد انتخاب شده
      </span>
      <span style={{ flex: 1 }} />
      {children}
      <Button type="text" size="small" onClick={onClear}>
        لغو انتخاب
      </Button>
    </div>
  )
}

interface ExportButtonProps {
  filename: string
  headers: string[]
  rows: () => (string | number | null | undefined)[][]
  label?: string
  size?: ButtonProps['size']
}

/** خروجی Excel (xlsx واقعی، راست‌به‌چپ) */
export function ExportButton({ filename, headers, rows, label = 'خروجی اکسل', size }: ExportButtonProps) {
  const [busy, setBusy] = useState(false)
  return (
    <Button
      size={size}
      icon={<DownloadOutlined />}
      loading={busy}
      onClick={async () => {
        setBusy(true)
        try {
          await exportXlsx(filename, headers, rows())
        } catch {
          notify.error('ساخت فایل اکسل ناموفق بود.')
        } finally {
          setBusy(false)
        }
      }}
    >
      {label}
    </Button>
  )
}

/** انتخاب فایل بدون آپلود خودکار */
export function ImportButton({ accept, onFile, label = 'بارگذاری فایل', loading, size }: { accept?: string; onFile: (f: File) => void; label?: string; loading?: boolean; size?: ButtonProps['size'] }) {
  return (
    <Upload accept={accept} showUploadList={false} beforeUpload={(f) => (onFile(f), false)}>
      <Button icon={<UploadOutlined />} loading={loading} size={size}>
        {label}
      </Button>
    </Upload>
  )
}
