import * as yup from 'yup'
import { toLatinDigits } from './digits'

/** کد ملی ۱۰ رقمی اشخاص حقیقی */
export function isValidNationalCode(code: string): boolean {
  if (!/^\d{10}$/.test(code) || /^(\d)\1{9}$/.test(code)) return false
  const digits = code.split('').map(Number)
  const sum = digits.slice(0, 9).reduce((s, d, i) => s + d * (10 - i), 0)
  const r = sum % 11
  return digits[9] === (r < 2 ? r : 11 - r)
}

/** شناسه ملی ۱۱ رقمی اشخاص حقوقی */
export function isValidLegalId(code: string): boolean {
  if (!/^\d{11}$/.test(code) || /^(\d)\1{10}$/.test(code)) return false
  const digits = code.split('').map(Number)
  const dec = digits[9] + 2
  const coef = [29, 27, 23, 19, 17, 29, 27, 23, 19, 17]
  const sum = coef.reduce((s, c, i) => s + (digits[i] + dec) * c, 0)
  let r = sum % 11
  if (r === 10) r = 0
  return r === digits[10]
}

export const isValidMobile = (m: string) => /^09\d{9}$/.test(m)

/** رشته‌ای که ارقام فارسی را لاتین و فاصله‌ها را حذف می‌کند */
export const faString = () =>
  yup.string().transform((v) => (typeof v === 'string' ? toLatinDigits(v).trim() : v))

export const requiredMsg = 'این فیلد الزامی است'
