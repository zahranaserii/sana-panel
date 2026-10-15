export const fmt = (n: number | null | undefined) => Math.round(n || 0).toLocaleString('fa-IR')
export const toToman = (rial: number) => Math.round((rial || 0) / 10)
export const rialText = (n: number) => `${fmt(n)} ریال (${fmt(toToman(n))} تومان)`

const ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه']
const TEENS = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده']
const TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود']
const HUNDREDS = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد']
const SCALES = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون']

function threeDigits(num: number) {
  const parts: string[] = []
  const h = Math.floor(num / 100)
  const rem = num % 100
  if (h) parts.push(HUNDREDS[h])
  if (rem >= 10 && rem < 20) parts.push(TEENS[rem - 10])
  else {
    const t = Math.floor(rem / 10)
    const o = rem % 10
    if (t) parts.push(TENS[t])
    if (o) parts.push(ONES[o])
  }
  return parts.join(' و ')
}

export function numberToPersianWords(input: number): string {
  const num = Math.round(input)
  if (num === 0) return 'صفر'
  if (num < 0) return 'منفی ' + numberToPersianWords(-num)
  const groups: number[] = []
  let n = num
  while (n > 0) {
    groups.push(n % 1000)
    n = Math.floor(n / 1000)
  }
  const parts: string[] = []
  for (let i = groups.length - 1; i >= 0; i--) {
    if (!groups[i]) continue
    parts.push(threeDigits(groups[i]) + (SCALES[i] ? ' ' + SCALES[i] : ''))
  }
  return parts.join(' و ')
}

export const tomanWords = (rial: number) => numberToPersianWords(toToman(rial)) + ' تومان'
