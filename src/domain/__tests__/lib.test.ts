import { describe, expect, it } from 'vitest'
import { faDigits, toLatinDigits } from '@/lib/digits'
import { formatJalali, jalaliToISO, jMonthsBetween, parseJalaliString } from '@/lib/jalali'
import { numberToPersianWords } from '@/lib/money'
import { isValidLegalId, isValidMobile, isValidNationalCode } from '@/lib/validators'

describe('validators', () => {
  it('national code checksum', () => {
    expect(isValidNationalCode('0012345679')).toBe(true)
    expect(isValidNationalCode('0012345678')).toBe(false)
    expect(isValidNationalCode('1111111111')).toBe(false)
    expect(isValidNationalCode('123')).toBe(false)
  })
  it('legal (company) id checksum', () => {
    expect(isValidLegalId('10101234567')).toBe(false)
    // ۱۰ رقم اول + رقم کنترل محاسبه‌شده
    const ten = '1010123456'
    const valid = [...Array(10).keys()].map((d) => ten + d).filter(isValidLegalId)
    expect(valid).toHaveLength(1)
  })
  it('mobile', () => {
    expect(isValidMobile('09121234567')).toBe(true)
    expect(isValidMobile('9121234567')).toBe(false)
  })
})

describe('digits', () => {
  it('round-trips Persian digits', () => {
    expect(toLatinDigits('۱۴۰۴/۰۳/۱۰')).toBe('1404/03/10')
    expect(faDigits('1404')).toBe('۱۴۰۴')
  })
})

describe('jalali', () => {
  it('converts both ways', () => {
    expect(jalaliToISO(1404, 1, 1)).toBe('2025-03-21')
    expect(formatJalali('2025-03-21', false)).toBe('1404/01/01')
    expect(parseJalaliString('۱۴۰۴/۰۱/۰۱')).toBe('2025-03-21')
    expect(parseJalaliString('abc')).toBeNull()
  })
  it('counts full months', () => {
    expect(jMonthsBetween(jalaliToISO(1404, 1, 10)!, jalaliToISO(1404, 2, 9)!)).toBe(0)
    expect(jMonthsBetween(jalaliToISO(1404, 1, 10)!, jalaliToISO(1404, 2, 10)!)).toBe(1)
  })
})

describe('numberToPersianWords', () => {
  it('formats amounts', () => {
    expect(numberToPersianWords(0)).toBe('صفر')
    expect(numberToPersianWords(1_250_000)).toBe('یک میلیون و دویست و پنجاه هزار')
    expect(numberToPersianWords(15)).toBe('پانزده')
  })
})
