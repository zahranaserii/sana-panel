/**
 * اتصال react-hook-form به کامپوننت‌های antd.
 * Form.Item فقط برای چیدمان/نمایش خطا است؛ state و اعتبارسنجی کاملاً در RHF + yup است
 * (store فرم antd کنار RHF = دو منبع حقیقت و باگ همگام‌سازی).
 *
 * استفاده:  <TextField control={control} name="fullName" label="نام" required />
 */
import { UploadOutlined } from '@ant-design/icons'
import { Button, Form, Input, InputNumber, Radio, Select, Switch, Upload } from 'antd'
import type { InputNumberProps, InputProps, SelectProps } from 'antd'
import type { TextAreaProps } from 'antd/es/input'
import type { CSSProperties, ReactNode } from 'react'
import { type Control, Controller, type ControllerRenderProps, type FieldValues, type Path } from 'react-hook-form'
import { AmountInput } from '../ui/AmountInput'
import { JalaliDatePicker } from '../ui/JalaliDatePicker'

export interface FieldProps<T extends FieldValues> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<T, any, any>
  name: Path<T>
  label?: ReactNode
  required?: boolean
  /** راهنمای زیر فیلد */
  extra?: ReactNode
  placeholder?: string
  disabled?: boolean
  style?: CSSProperties
}

type Render<T extends FieldValues> = (field: ControllerRenderProps<T, Path<T>>, status: '' | 'error', id: string) => ReactNode

export function FormField<T extends FieldValues>({ control, name, label, required, extra, style, render }: FieldProps<T> & { render: Render<T> }) {
  const id = `f_${String(name).replace(/\./g, '_')}` // اتصال label به input (دسترس‌پذیری)
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Form.Item
          label={label}
          required={required}
          validateStatus={fieldState.error ? 'error' : undefined}
          help={fieldState.error?.message}
          extra={extra}
          style={style}
          htmlFor={id}
        >
          {render(field, fieldState.error ? 'error' : '', id)}
        </Form.Item>
      )}
    />
  )
}

export function TextField<T extends FieldValues>({ inputProps, ...p }: FieldProps<T> & { inputProps?: InputProps }) {
  return (
    <FormField
      {...p}
      render={(f, status, id) => (
        <Input id={id} placeholder={p.placeholder} disabled={p.disabled} {...inputProps} {...f} value={f.value ?? ''} status={status} />
      )}
    />
  )
}

export function PasswordField<T extends FieldValues>({ inputProps, ...p }: FieldProps<T> & { inputProps?: InputProps }) {
  return (
    <FormField
      {...p}
      render={(f, status, id) => (
        <Input.Password id={id} placeholder={p.placeholder} disabled={p.disabled} {...inputProps} {...f} value={f.value ?? ''} status={status} />
      )}
    />
  )
}

export function TextAreaField<T extends FieldValues>({ inputProps, ...p }: FieldProps<T> & { inputProps?: TextAreaProps }) {
  return (
    <FormField
      {...p}
      render={(f, status, id) => (
        <Input.TextArea id={id} rows={3} placeholder={p.placeholder} disabled={p.disabled} showCount maxLength={500} {...inputProps} {...f} value={f.value ?? ''} status={status} />
      )}
    />
  )
}

export function NumberField<T extends FieldValues>({ inputProps, ...p }: FieldProps<T> & { inputProps?: InputNumberProps<number> }) {
  return (
    <FormField
      {...p}
      render={(f, status, id) => (
        <InputNumber<number>
          id={id}
          style={{ width: '100%' }}
          placeholder={p.placeholder}
          disabled={p.disabled}
          {...inputProps}
          value={f.value ?? null}
          onChange={(v) => f.onChange(v ?? null)}
          onBlur={f.onBlur}
          ref={f.ref}
          status={status}
        />
      )}
    />
  )
}

/** مبلغ ریالی با جداکننده هزارگان و نمایش به حروف */
export function MoneyField<T extends FieldValues>({ showWords = true, ...p }: FieldProps<T> & { showWords?: boolean }) {
  return (
    <FormField
      {...p}
      render={(f, status, id) => (
        <AmountInput id={id} value={f.value} onChange={f.onChange} onBlur={f.onBlur} status={status} disabled={p.disabled} showWords={showWords} />
      )}
    />
  )
}

export function SelectField<T extends FieldValues>({ options, selectProps, ...p }: FieldProps<T> & { options: SelectProps['options']; selectProps?: SelectProps }) {
  return (
    <FormField
      {...p}
      render={(f, status, id) => (
        <Select
          id={id}
          placeholder={p.placeholder ?? 'انتخاب کنید'}
          disabled={p.disabled}
          showSearch={{ optionFilterProp: 'label' }}
          {...selectProps}
          options={options}
          value={f.value === '' ? undefined : f.value}
          onChange={f.onChange}
          onBlur={f.onBlur}
          status={status}
        />
      )}
    />
  )
}

/** بله/خیر به‌صورت دکمه‌های کنار هم (برای سؤال‌های دوحالته واضح‌تر از Switch) */
export function YesNoField<T extends FieldValues>(p: FieldProps<T>) {
  return (
    <FormField
      {...p}
      render={(f) => (
        <Radio.Group
          optionType="button"
          buttonStyle="solid"
          disabled={p.disabled}
          value={f.value}
          onChange={(e) => f.onChange(e.target.value)}
          options={[
            { label: 'بله', value: true },
            { label: 'خیر', value: false },
          ]}
        />
      )}
    />
  )
}

export function SwitchField<T extends FieldValues>(p: FieldProps<T>) {
  return <FormField {...p} render={(f, _s, id) => <Switch id={id} checked={!!f.value} onChange={f.onChange} disabled={p.disabled} />} />
}

export function RadioField<T extends FieldValues>({ options, ...p }: FieldProps<T> & { options: { label: ReactNode; value: string | number | boolean }[] }) {
  return (
    <FormField
      {...p}
      render={(f) => <Radio.Group disabled={p.disabled} value={f.value} onChange={(e) => f.onChange(e.target.value)} options={options} />}
    />
  )
}

export function DateField<T extends FieldValues>(p: FieldProps<T>) {
  return (
    <FormField
      {...p}
      render={(f, status, id) => (
        <JalaliDatePicker id={id} value={f.value} onChange={f.onChange} onBlur={f.onBlur} status={status} disabled={p.disabled} placeholder={p.placeholder} />
      )}
    />
  )
}

/** مقدار فیلد: File | null — فایل در حافظه نگه داشته و هنگام submit آپلود می‌شود */
export function FileField<T extends FieldValues>({ accept, currentName, ...p }: FieldProps<T> & { accept?: string; currentName?: string }) {
  return (
    <FormField
      {...p}
      render={(f) => (
        <div>
          <Upload
            accept={accept}
            maxCount={1}
            disabled={p.disabled}
            beforeUpload={(file) => {
              f.onChange(file)
              return false
            }}
            onRemove={() => f.onChange(null)}
            fileList={f.value ? [{ uid: '1', name: (f.value as File).name, status: 'done' }] : []}
          >
            <Button icon={<UploadOutlined />}>انتخاب فایل</Button>
          </Upload>
          {!f.value && currentName && <div className="hint">فایل فعلی: {currentName}</div>}
        </div>
      )}
    />
  )
}
