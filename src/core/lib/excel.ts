/**
 * خروجی/ورودی اکسل واقعی (xlsx) با exceljs.
 * کتابخانه به‌صورت lazy لود می‌شود تا حجم باندل اولیه زیاد نشود.
 */
type Cell = string | number | null | undefined

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function exportXlsx(filename: string, headers: string[], rows: Cell[][]) {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Sheet1', { views: [{ rightToLeft: true }] })
  const head = ws.addRow(headers)
  head.font = { bold: true }
  rows.forEach((r) => ws.addRow(r.map((v) => (v === null || v === undefined ? '' : v))))
  ws.columns.forEach((col, i) => {
    const longest = Math.max(headers[i]?.length ?? 0, ...rows.map((r) => String(r[i] ?? '').length))
    col.width = Math.min(60, Math.max(12, longest + 2))
  })
  const buf = await wb.xlsx.writeBuffer()
  downloadBlob(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`,
  )
}

/** اولین شیت را به آرایه‌ای از ردیف‌های متنی تبدیل می‌کند (ردیف عنوان هم برگردانده می‌شود) */
export async function readXlsx(file: File): Promise<string[][]> {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  const ws = wb.worksheets[0]
  if (!ws) return []
  const rows: string[][] = []
  ws.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = []
    for (let c = 1; c <= ws.columnCount; c++) cells.push(row.getCell(c).text?.trim() ?? '')
    rows.push(cells)
  })
  return rows
}
