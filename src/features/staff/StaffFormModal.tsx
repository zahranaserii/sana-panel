import { yupResolver } from '@hookform/resolvers/yup'
import { Form, Modal } from 'antd'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { staffApi, type StaffInput } from '@/api/staff.api'
import { RHFDate, RHFInput, RHFNumber } from '@/components/form'
import { qk, useApiMutation } from '@/queries'
import type { Staff } from '@/types'
import { staffSchema, type StaffValues } from './schema'

interface Props {
  open: boolean
  companyId: string
  staff: Staff | null
  nextPriority: number
  onClose: () => void
}

export function StaffFormModal({ open, companyId, staff, nextPriority, onClose }: Props) {
  const { control, handleSubmit, reset } = useForm<StaffValues>({ resolver: yupResolver(staffSchema) })
  useEffect(() => {
    if (!open) return
    reset(
      staff
        ? { ...staff, hireDate: staff.hireDate ?? undefined }
        : { fullName: '', nationalCode: '', mobile: '', personnelCode: '', hireDate: undefined, priority: nextPriority },
    )
  }, [open, staff, nextPriority, reset])

  const save = useApiMutation(
    (input: StaffInput) => (staff ? staffApi.update(staff.id, input) : staffApi.create(companyId, input)),
    { invalidate: [qk.staffRoot], successMessage: staff ? 'تغییرات پرسنل ذخیره شد.' : 'پرسنل ثبت شد.' },
  )

  return (
    <Modal
      open={open}
      title={staff ? `ویرایش ${staff.fullName}` : 'افزودن پرسنل'}
      okText={staff ? 'ذخیره تغییرات' : 'ثبت پرسنل'}
      onCancel={onClose}
      okButtonProps={{ loading: save.isPending }}
      onOk={handleSubmit((v) => save.mutate({ ...v, hireDate: v.hireDate }, { onSuccess: onClose }))}
      width={640}
      destroyOnHidden
    >
      <Form layout="vertical" component={false}>
        <div className="form-grid">
          <RHFInput control={control} name="fullName" label="نام و نام خانوادگی" required />
          <RHFInput control={control} name="nationalCode" label="کد ملی" required inputProps={{ inputMode: 'numeric', maxLength: 10 }} />
          <RHFInput control={control} name="mobile" label="شماره موبایل" required inputProps={{ inputMode: 'tel', maxLength: 11 }} />
          <RHFInput control={control} name="personnelCode" label="کد پرسنلی" required />
          <RHFDate control={control} name="hireDate" label="تاریخ استخدام" required />
          <RHFNumber control={control} name="priority" label="اولویت تخصیص" required extra="عدد کوچک‌تر = اولویت بالاتر" inputProps={{ min: 1 }} />
        </div>
      </Form>
    </Modal>
  )
}
