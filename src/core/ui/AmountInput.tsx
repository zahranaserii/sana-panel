import { InputNumber } from 'antd'
import { toLatinDigits } from '../lib/digits'
import { tomanWords } from '../lib/money'

interface Props {
  id?: string
  value?: number | null
  onChange?: (v: number | null) => void
  onBlur?: () => void
  status?: '' | 'error'
  disabled?: boolean
  placeholder?: string
  /** نمایش مبلغ به حروف (تومان) زیر فیلد */
  showWords?: boolean
  width?: number | string
}

const group = (v: string) => v.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

export function AmountInput({ id, value, onChange, onBlur, status, disabled, placeholder = '۰', showWords, width = '100%' }: Props) {
  return (
    <div style={{ width }}>
      <InputNumber<number>
        id={id}
        style={{ width: '100%' }}
        min={0}
        max={1e15}
        controls={false}
        value={value ?? null}
        onChange={(v) => onChange?.(v ?? null)}
        onBlur={onBlur}
        status={status}
        disabled={disabled}
        placeholder={placeholder}
        suffix="ریال"
        formatter={(v) => (v === undefined || v === null || String(v) === '' ? '' : group(String(v)))}
        parser={(v) => Number(toLatinDigits(v ?? '').replace(/[^\d]/g, '') || 0)}
      />
      {showWords && !!value && <div className="hint" style={{ marginTop: 4 }}>{tomanWords(value)}</div>}
    </div>
  )
}
