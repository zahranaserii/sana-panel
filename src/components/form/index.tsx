/**
 * اتصال react-hook-form به کامپوننت‌های antd.
 * از Form.Item فقط برای چیدمان/نمایش خطا استفاده می‌شود؛ state و اعتبارسنجی
 * کاملاً در RHF + yup است (antd Form در کنار RHF نباید state نگه دارد).
 */
import { Form, Input, InputNumber, Radio, Select, Upload, Button } from 'antd'
import type { InputNumberProps, InputProps, SelectProps } from 'antd'
import type { TextAreaProps } from 'antd/es/input'
import { UploadOutlined } from '@ant-design/icons'
import type { CSSProperties, ReactNode } from 'react'
import {
  Controller,
  type Control,
  type ControllerRenderProps,
  type FieldValues,
  type Path,
} from 'react-hook-form'
import { AmountInput } from '../AmountInput'
import { JalaliDatePicker } from '../JalaliDatePicker'

interface BaseProps<T extends FieldValues> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<T, any, any>
  name: Path<T>
  label?: ReactNode
  required?: boolean
  extra?: ReactNode
  style?: CSSProperties
}

export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  required,
  extra,
  style,
  render,
}: BaseProps<T> & {
  render: (field: ControllerRenderProps<T, Path<T>>, status: '' | 'error', id: string) => ReactNode
}) {
  // id برای اتصال label به input (دسترس‌پذیری و تست)
  const id = `f_${String(name).replace(/\./g, '_')}`
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

export function RHFInput<T extends FieldValues>(props: BaseProps<T> & { inputProps?: InputProps }) {
  const { inputProps, ...rest } = props
  return (
    <FormField
      {...rest}
      render={(f, status, id) => <Input id={id} {...inputProps} {...f} value={f.value ?? ''} status={status} />}
    />
  )
}

export function RHFPassword<T extends FieldValues>(props: BaseProps<T> & { inputProps?: InputProps }) {
  const { inputProps, ...rest } = props
  return (
    <FormField
      {...rest}
      render={(f, status, id) => <Input.Password id={id} {...inputProps} {...f} value={f.value ?? ''} status={status} />}
    />
  )
}

export function RHFTextArea<T extends FieldValues>(props: BaseProps<T> & { inputProps?: TextAreaProps }) {
  const { inputProps, ...rest } = props
  return (
    <FormField
      {...rest}
      render={(f, status, id) => <Input.TextArea id={id} rows={3} {...inputProps} {...f} value={f.value ?? ''} status={status} />}
    />
  )
}

export function RHFNumber<T extends FieldValues>(props: BaseProps<T> & { inputProps?: InputNumberProps<number> }) {
  const { inputProps, ...rest } = props
  return (
    <FormField
      {...rest}
      render={(f, status, id) => (
        <InputNumber<number>
          id={id}
          style={{ width: '100%' }}
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

export function RHFAmount<T extends FieldValues>(props: BaseProps<T> & { showWords?: boolean }) {
  const { showWords, ...rest } = props
  return (
    <FormField
      {...rest}
      render={(f, status, id) => (
        <AmountInput id={id} value={f.value} onChange={f.onChange} onBlur={f.onBlur} status={status} showWords={showWords} />
      )}
    />
  )
}

export function RHFSelect<T extends FieldValues>(
  props: BaseProps<T> & { options: SelectProps['options']; selectProps?: SelectProps },
) {
  const { options, selectProps, ...rest } = props
  return (
    <FormField
      {...rest}
      render={(f, status, id) => (
        <Select
          id={id}
          placeholder="— انتخاب کنید —"
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

export function RHFYesNo<T extends FieldValues>(props: BaseProps<T>) {
  return (
    <FormField
      {...props}
      render={(f) => (
        <Radio.Group
          optionType="button"
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

export function RHFDate<T extends FieldValues>(props: BaseProps<T>) {
  return (
    <FormField
      {...props}
      render={(f, status, id) => (
        <JalaliDatePicker id={id} value={f.value} onChange={f.onChange} onBlur={f.onBlur} status={status} />
      )}
    />
  )
}

/** مقدار فیلد: File | null (فایل در حافظه نگه داشته می‌شود و هنگام submit آپلود می‌شود) */
export function RHFFile<T extends FieldValues>(props: BaseProps<T> & { accept?: string; currentName?: string }) {
  const { accept, currentName, ...rest } = props
  return (
    <FormField
      {...rest}
      render={(f) => (
        <div>
          <Upload
            accept={accept}
            maxCount={1}
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
