import { SearchOutlined } from '@ant-design/icons'
import { Input } from 'antd'
import { DateRangeFilter, FilterBar, FilterItem } from '@/core/ui'
import type { useStaffFilter } from './useStaffFilter'

/** فیلتر مشترک پرسنل (صفحه پرسنل و انتخاب پرسنل در تخصیص وام) */
export function StaffFilters({ f }: { f: ReturnType<typeof useStaffFilter> }) {
  const dirty = !!(f.search || f.from || f.to)
  return (
    <FilterBar
      onReset={
        dirty
          ? () => {
              f.setSearch('')
              f.setFrom(null)
              f.setTo(null)
            }
          : undefined
      }
    >
      <FilterItem label="جستجو">
        <Input prefix={<SearchOutlined className="faint" />} allowClear value={f.search} onChange={(e) => f.setSearch(e.target.value)} placeholder="نام، کد ملی، موبایل، کد پرسنلی…" />
      </FilterItem>
      <DateRangeFilter
        from={f.from}
        to={f.to}
        labels={['استخدام از', 'استخدام تا']}
        onChange={(a, b) => {
          f.setFrom(a)
          f.setTo(b)
        }}
      />
    </FilterBar>
  )
}
