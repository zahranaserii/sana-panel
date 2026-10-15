import { SearchOutlined } from '@ant-design/icons'
import { Input } from 'antd'
import { JalaliDatePicker } from '@/components/JalaliDatePicker'
import type { useStaffFilter } from './useStaffFilter'

export function StaffFilters({ f }: { f: ReturnType<typeof useStaffFilter> }) {
  return (
    <div className="form-grid" style={{ marginBottom: 12, rowGap: 8 }}>
      <div>
        <div className="field-label">جستجو (نام، کد ملی، موبایل، کد پرسنلی)</div>
        <Input prefix={<SearchOutlined />} allowClear value={f.search} onChange={(e) => f.setSearch(e.target.value)} placeholder="جستجو..." />
      </div>
      <div>
        <div className="field-label">از تاریخ استخدام</div>
        <JalaliDatePicker value={f.from} onChange={f.setFrom} />
      </div>
      <div>
        <div className="field-label">تا تاریخ استخدام</div>
        <JalaliDatePicker value={f.to} onChange={f.setTo} />
      </div>
    </div>
  )
}
