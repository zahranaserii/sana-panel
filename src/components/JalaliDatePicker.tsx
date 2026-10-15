import { CalendarOutlined } from '@ant-design/icons'
import { Input } from 'antd'
import persian from 'react-date-object/calendars/persian'
import persian_fa from 'react-date-object/locales/persian_fa'
import DatePickerModule from 'react-multi-date-picker'
import type DateObject from 'react-date-object'
import { dateToISO, isoToDate } from '@/lib/jalali'
import type { ISODate } from '@/types'

// پکیج CommonJS است؛ در Vite dev، default گاهی داخل یک آبجکت دیگر قرار می‌گیرد (CJS interop)
const DatePicker = ((DatePickerModule as unknown as { default?: typeof DatePickerModule }).default ??
  DatePickerModule) as typeof DatePickerModule

const isDateObject = (d: unknown): d is DateObject =>
  !!d && typeof (d as DateObject).toDate === 'function'

interface Props {
  id?: string
  value?: ISODate | null
  onChange?: (v: ISODate | null) => void
  onBlur?: () => void
  placeholder?: string
  status?: '' | 'error'
  disabled?: boolean
}

/**
 * انتخابگر تاریخ شمسی که مقدار را به‌صورت ISO میلادی برمی‌گرداند.
 * (antd DatePicker به‌صورت پیش‌فرض تقویم جلالی ندارد.)
 */
export function JalaliDatePicker({ id, value, onChange, onBlur, placeholder = '۱۴۰۴/۰۱/۰۱', status, disabled }: Props) {
  return (
    <DatePicker
      value={value ? isoToDate(value) : null}
      onChange={(d) => onChange?.(isDateObject(d) ? dateToISO(d.toDate()) : null)}
      onClose={() => onBlur?.()}
      calendar={persian}
      locale={persian_fa}
      calendarPosition="bottom-right"
      portal
      zIndex={2100}
      disabled={disabled}
      containerStyle={{ width: '100%' }}
      render={(val, openCalendar) => (
        <Input
          id={id}
          value={val}
          onClick={openCalendar}
          readOnly
          placeholder={placeholder}
          status={status}
          disabled={disabled}
          allowClear
          onChange={(e) => {
            if (!e.target.value) onChange?.(null)
          }}
          suffix={<CalendarOutlined style={{ color: '#98a2b3' }} />}
        />
      )}
    />
  )
}
