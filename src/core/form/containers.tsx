import { Button, Drawer, Form, Modal, Space } from 'antd'
import type { CSSProperties, ReactNode } from 'react'
import type { FieldValues, SubmitHandler, UseFormReturn } from 'react-hook-form'
import { confirm } from '../ui/feedback'

/** چیدمان عمودی antd بدون store فرم antd */
export function FormLayout({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  return (
    <Form layout="vertical" component={false} disabled={disabled}>
      {children}
    </Form>
  )
}

/** چیدمان ستونی واکنش‌گرا برای فیلدها */
export function FormGrid({ children, min = 240, style }: { children: ReactNode; min?: number; style?: CSSProperties }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(min(${min}px, 100%), 1fr))`, columnGap: 16, ...style }}>
      {children}
    </div>
  )
}

/** تیتر بخش داخل فرم */
export function FormSection({ title, description, children }: { title: ReactNode; description?: ReactNode; children: ReactNode }) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: '0 0 8px' }}>
      <legend style={{ fontWeight: 800, fontSize: 14, marginBottom: description ? 0 : 10, color: 'var(--c-primary)' }}>{title}</legend>
      {description && <div className="hint" style={{ marginBottom: 10 }}>{description}</div>}
      {children}
    </fieldset>
  )
}

interface DialogFormProps<T extends FieldValues> {
  open: boolean
  onClose: () => void
  title: ReactNode
  form: UseFormReturn<T, unknown, T> | UseFormReturn<T>
  onSubmit: SubmitHandler<T>
  submitText?: string
  loading?: boolean
  danger?: boolean
  width?: number
  children: ReactNode
  /** محتوای بالای فیلدها (مثلاً خلاصه رکورد) */
  intro?: ReactNode
}

/** بستن با تأیید، اگر تغییر ذخیره‌نشده وجود دارد */
async function guardedClose(dirty: boolean, onClose: () => void) {
  if (!dirty || (await confirm({ title: 'تغییرات ذخیره نشده‌اند', content: 'با بستن فرم، تغییرات از بین می‌رود.', okText: 'بستن بدون ذخیره', danger: true })))
    onClose()
}

/** فرم داخل Drawer — برای فرم‌های بلند (ثبت/ویرایش موجودیت) */
export function FormDrawer<T extends FieldValues>({ open, onClose, title, form, onSubmit, submitText = 'ذخیره', loading, width = 720, children, intro }: DialogFormProps<T>) {
  const submit = (form as UseFormReturn<T>).handleSubmit(onSubmit)
  // خواندن isDirty هنگام رندر لازم است تا RHF آن را ردیابی کند (formState یک Proxy است)
  const dirty = form.formState.isDirty
  return (
    <Drawer
      open={open}
      onClose={() => guardedClose(dirty, onClose)}
      size={width}
      title={title}
      destroyOnHidden
      footer={
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={() => guardedClose(dirty, onClose)}>انصراف</Button>
          <Button type="primary" loading={loading} onClick={submit}>
            {submitText}
          </Button>
        </Space>
      }
    >
      <form onSubmit={submit} noValidate>
        {intro}
        <FormLayout>{children}</FormLayout>
        <button type="submit" hidden />
      </form>
    </Drawer>
  )
}

/** فرم داخل Modal — برای فرم‌های کوتاه (تصمیم، تأیید، دلیل) */
export function FormModal<T extends FieldValues>({ open, onClose, title, form, onSubmit, submitText = 'ثبت', loading, danger, width = 520, children, intro }: DialogFormProps<T>) {
  const submit = (form as UseFormReturn<T>).handleSubmit(onSubmit)
  const dirty = form.formState.isDirty
  return (
    <Modal
      open={open}
      title={title}
      width={width}
      onCancel={() => guardedClose(dirty, onClose)}
      onOk={submit}
      okText={submitText}
      cancelText="انصراف"
      okButtonProps={{ loading, danger }}
      destroyOnHidden
    >
      <form onSubmit={submit} noValidate>
        {intro}
        <FormLayout>{children}</FormLayout>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
