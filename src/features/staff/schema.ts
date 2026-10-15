import * as yup from 'yup'
import { faString, isValidMobile, isValidNationalCode, requiredMsg } from '@/lib/validators'

export const staffSchema = yup.object({
  fullName: yup.string().trim().required(requiredMsg).max(100),
  nationalCode: faString()
    .required(requiredMsg)
    .test('nc', 'کد ملی معتبر نیست', (v) => !v || isValidNationalCode(v)),
  mobile: faString()
    .required(requiredMsg)
    .test('mobile', 'شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود', (v) => !v || isValidMobile(v)),
  personnelCode: faString().required(requiredMsg).max(30),
  hireDate: yup.string().nullable().required('تاریخ استخدام را وارد کنید'),
  priority: yup
    .number()
    .typeError('عدد وارد کنید')
    .required(requiredMsg)
    .integer('عدد صحیح وارد کنید')
    .min(1, 'حداقل ۱'),
})

export type StaffValues = yup.InferType<typeof staffSchema>

export const STAFF_SAMPLE_HEADERS = ['نام و نام خانوادگی', 'کد ملی', 'موبایل', 'کد پرسنلی', 'تاریخ استخدام (شمسی)', 'اولویت تخصیص']
export const STAFF_SAMPLE_ROW = ['علی محمدی', '0012345679', '09121234567', '101', '1403/02/15', 1]
