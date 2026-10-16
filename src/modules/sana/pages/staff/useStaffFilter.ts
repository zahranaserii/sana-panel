import { useDeferredValue, useMemo, useState } from 'react'
import { toLatinDigits } from '@/core/lib/digits'
import type { ISODate, Staff } from '../../types'

/** فیلتر جستجو + بازه تاریخ استخدام + مرتب‌سازی بر اساس اولویت (مشترک بین «پرسنل» و «تخصیص وام») */
export function useStaffFilter(staff: Staff[]) {
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState<ISODate | null>(null)
  const [to, setTo] = useState<ISODate | null>(null)
  const q = useDeferredValue(toLatinDigits(search).trim().toLowerCase())

  const rows = useMemo(
    () =>
      staff
        .filter((s) => {
          if (q) {
            const hay = toLatinDigits([s.fullName, s.nationalCode, s.mobile, s.personnelCode].join(' ')).toLowerCase()
            if (!hay.includes(q)) return false
          }
          if (from && (!s.hireDate || s.hireDate < from)) return false
          if (to && (!s.hireDate || s.hireDate > to)) return false
          return true
        })
        .sort((a, b) => a.priority - b.priority),
    [staff, q, from, to],
  )

  return { rows, search, setSearch, from, setFrom, to, setTo }
}
