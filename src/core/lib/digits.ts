const FA = '۰۱۲۳۴۵۶۷۸۹'
const AR = '٠١٢٣٤٥٦٧٨٩'

export const faDigits = (s: string | number) =>
  String(s).replace(/[0-9]/g, (d) => FA[Number(d)])

/** ارقام فارسی/عربی را به لاتین تبدیل می‌کند (برای اعتبارسنجی و ذخیره) */
export const toLatinDigits = (s: unknown) =>
  String(s ?? '')
    .replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)))
