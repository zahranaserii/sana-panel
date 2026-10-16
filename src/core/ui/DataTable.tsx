import { SearchOutlined } from '@ant-design/icons'
import { Input, Table } from 'antd'
import type { TableColumnsType, TableProps } from 'antd'
import { type Key, type ReactNode, useDeferredValue, useMemo, useState } from 'react'
import { toLatinDigits } from '../lib/digits'
import { BulkBar, ExportButton, type RowAction, RowActions } from './actions'
import { EmptyState } from './display'

const norm = (s: string) => toLatinDigits(s).toLowerCase().replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').trim()

export interface DataTableProps<T> extends Omit<TableProps<T>, 'columns' | 'rowSelection' | 'title'> {
  columns: TableColumnsType<T>
  data: T[] | undefined
  rowKey: keyof T & string
  /** متن قابل جستجوی هر ردیف؛ اگر داده شود جعبه جستجو نمایش داده می‌شود */
  searchText?: (row: T) => string
  searchPlaceholder?: string
  /** فیلترهای اضافه در نوار ابزار */
  filters?: ReactNode
  /** دکمه‌های سمت چپ نوار ابزار */
  toolbar?: ReactNode
  /** ستون «عملیات» خودکار */
  rowActions?: (row: T) => RowAction[]
  /** انتخاب چندتایی + نوار عملیات گروهی */
  bulkActions?: (selected: T[], clear: () => void) => ReactNode
  selectable?: (row: T) => boolean
  /** دکمه خروجی اکسل از ردیف‌های فیلترشده */
  exportAs?: { filename: string; headers: string[]; row: (r: T) => (string | number | null | undefined)[] }
  empty?: { title?: ReactNode; description?: ReactNode; action?: ReactNode }
  showCount?: boolean
}

/**
 * جدول عمومی: جستجو (با نرمال‌سازی ارقام و حروف فارسی/عربی)، نوار ابزار، حالت خالی،
 * اکشن ردیف، عملیات گروهی و خروجی اکسل — همه با یک prop.
 */
export function DataTable<T extends object>({
  columns,
  data,
  rowKey,
  searchText,
  searchPlaceholder = 'جستجو…',
  filters,
  toolbar,
  rowActions,
  bulkActions,
  selectable,
  exportAs,
  empty,
  showCount = true,
  pagination,
  ...rest
}: DataTableProps<T>) {
  const [q, setQ] = useState('')
  const query = useDeferredValue(norm(q))
  const [selected, setSelected] = useState<Key[]>([])

  const rows = useMemo(() => {
    const list = data ?? []
    if (!query || !searchText) return list
    return list.filter((r) => norm(searchText(r)).includes(query))
  }, [data, query, searchText])

  const cols = useMemo<TableColumnsType<T>>(
    () =>
      rowActions
        ? [...columns, { title: 'عملیات', key: '__actions', fixed: 'end', width: 1, render: (_, r) => <RowActions actions={rowActions(r)} /> }]
        : columns,
    [columns, rowActions],
  )

  const selectedRows = rows.filter((r) => selected.includes(r[rowKey] as Key))
  const clear = () => setSelected([])
  const hasToolbar = searchText || filters || toolbar || exportAs || showCount

  return (
    <div>
      {hasToolbar && (
        <div className="dt-toolbar">
          {searchText && (
            <Input
              className="dt-search"
              allowClear
              prefix={<SearchOutlined className="faint" />}
              placeholder={searchPlaceholder}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="جستجو در جدول"
            />
          )}
          {filters}
          <span className="dt-spacer" />
          {showCount && data && (
            <span className="dt-count num">
              {rows.length.toLocaleString('fa-IR')}
              {rows.length !== data.length && ` از ${data.length.toLocaleString('fa-IR')}`} مورد
            </span>
          )}
          {toolbar}
          {exportAs && <ExportButton filename={exportAs.filename} headers={exportAs.headers} rows={() => rows.map(exportAs.row)} />}
        </div>
      )}
      {bulkActions && <BulkBar count={selectedRows.length} onClear={clear}>{bulkActions(selectedRows, clear)}</BulkBar>}
      <Table<T>
        rowKey={rowKey}
        columns={cols}
        dataSource={rows}
        scroll={{ x: 'max-content' }}
        pagination={pagination ?? (rows.length > 10 ? { pageSize: 10, showSizeChanger: true, hideOnSinglePage: true } : false)}
        rowSelection={
          bulkActions
            ? {
                selectedRowKeys: selected,
                onChange: setSelected,
                getCheckboxProps: selectable ? (r) => ({ disabled: !selectable(r) }) : undefined,
              }
            : undefined
        }
        locale={{
          emptyText: query ? (
            <EmptyState title="نتیجه‌ای پیدا نشد" description={`برای «${q}» موردی وجود ندارد.`} />
          ) : (
            <EmptyState {...empty} />
          ),
        }}
        {...rest}
      />
    </div>
  )
}
