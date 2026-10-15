import { DownloadOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { App, Button, Space, Table, Upload } from 'antd'
import { useState } from 'react'
import { staffApi, type StaffInput } from '@/api/staff.api'
import { CompanySelect, Section, useSelectedCompany } from '@/components/common'
import { faDigits } from '@/lib/digits'
import { exportXlsx, readXlsx } from '@/lib/excel'
import { formatJalali, parseJalaliString } from '@/lib/jalali'
import { fmt } from '@/lib/money'
import { qk, useApiMutation, useStaff } from '@/queries'
import { usePermissions } from '@/queries/auth'
import type { Staff } from '@/types'
import { STAFF_SAMPLE_HEADERS, STAFF_SAMPLE_ROW, staffSchema } from './schema'
import { StaffFilters } from './StaffFilters'
import { StaffFormModal } from './StaffFormModal'
import { useStaffFilter } from './useStaffFilter'

export default function StaffPage() {
  const { modal } = App.useApp()
  const { company, companyId } = useSelectedCompany()
  const { data: staff = [], isLoading } = useStaff(companyId)
  const { can } = usePermissions()
  const filter = useStaffFilter(staff)
  const [form, setForm] = useState<{ open: boolean; staff: Staff | null }>({ open: false, staff: null })

  const remove = useApiMutation((id: string) => staffApi.remove(id), { invalidate: [qk.staffRoot], successMessage: 'حذف شد.' })
  const bulk = useApiMutation((rows: StaffInput[]) => staffApi.bulkCreate(companyId!, rows), {
    invalidate: [qk.staffRoot],
    successMessage: (r) =>
      `${faDigits(r.added)} نفر اضافه شد.` + (r.skipped.length ? ` ${faDigits(r.skipped.length)} نفر تکراری نادیده گرفته شد.` : ''),
  })

  /** خواندن اکسل، اعتبارسنجی هر ردیف با همان schema فرم، و نمایش خطاها قبل از ثبت */
  const onUpload = async (file: File) => {
    try {
      const rows = (await readXlsx(file)).slice(1).filter((r) => r.some(Boolean))
      const valid: StaffInput[] = []
      const errors: string[] = []
      rows.forEach((cols, i) => {
        try {
          const v = staffSchema.validateSync(
            {
              fullName: cols[0],
              nationalCode: cols[1],
              mobile: cols[2],
              personnelCode: cols[3],
              hireDate: parseJalaliString(cols[4] ?? ''),
              priority: cols[5] ? Number(cols[5]) : 999,
            },
            { abortEarly: true },
          )
          valid.push(v)
        } catch (e) {
          errors.push(`ردیف ${faDigits(i + 2)}: ${(e as Error).message}`)
        }
      })
      if (!valid.length && !errors.length) return void modal.warning({ title: 'فایل خالی است.' })
      modal.confirm({
        title: `${faDigits(valid.length)} ردیف معتبر، ${faDigits(errors.length)} ردیف نامعتبر`,
        width: 560,
        content: errors.length ? (
          <ul style={{ maxHeight: 240, overflow: 'auto', paddingInlineStart: 18 }}>
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        ) : 'همه ردیف‌ها معتبر هستند.',
        okText: 'ثبت ردیف‌های معتبر',
        okButtonProps: { disabled: !valid.length },
        onOk: () => bulk.mutateAsync(valid),
      })
    } catch {
      modal.error({ title: 'فایل قابل خواندن نیست. از فایل نمونه (xlsx) استفاده کنید.' })
    }
  }

  return (
    <>
      <Section>
        <CompanySelect />
      </Section>
      <Section
        title={<span>پرسنل شرکت {company && <span className="hint">({fmt(staff.length)} نفر)</span>}</span>}
        extra={
          companyId && (
            <Space wrap>
              {can('staff.add') && (
                <Button icon={<PlusOutlined />} onClick={() => setForm({ open: true, staff: null })}>
                  افزودن پرسنل
                </Button>
              )}
              {can('staff.upload') && (
                <>
                  <Button icon={<DownloadOutlined />} onClick={() => exportXlsx('نمونه-فایل-پرسنل', STAFF_SAMPLE_HEADERS, [STAFF_SAMPLE_ROW])}>
                    دانلود نمونه فایل
                  </Button>
                  <Upload accept=".xlsx" showUploadList={false} beforeUpload={(f) => (onUpload(f), false)}>
                    <Button icon={<UploadOutlined />} loading={bulk.isPending}>آپلود فایل اکسل</Button>
                  </Upload>
                </>
              )}
            </Space>
          )
        }
        sub="برای بارگذاری گروهی، فایل نمونه را دانلود و پس از تکمیل بارگذاری کنید. فهرست پرسنل و صفحه پرداخت وام بر اساس اولویت مرتب می‌شوند."
      >
        <StaffFilters f={filter} />
        <Table<Staff>
          rowKey="id"
          loading={isLoading}
          dataSource={filter.rows}
          scroll={{ x: 800 }}
          locale={{ emptyText: companyId ? 'پرسنلی با این شرایط یافت نشد.' : 'ابتدا یک شرکت انتخاب کنید.' }}
          columns={[
            { title: 'اولویت', dataIndex: 'priority', width: 80, render: (p) => <b>{faDigits(p)}</b> },
            { title: 'نام', dataIndex: 'fullName' },
            { title: 'کد ملی', dataIndex: 'nationalCode', render: faDigits },
            { title: 'موبایل', dataIndex: 'mobile', render: faDigits },
            { title: 'کد پرسنلی', dataIndex: 'personnelCode', render: faDigits },
            { title: 'تاریخ استخدام', dataIndex: 'hireDate', render: (d) => formatJalali(d) },
            {
              title: 'عملیات',
              render: (_, s) => (
                <Space size={4}>
                  {can('staff.edit') && <Button size="small" onClick={() => setForm({ open: true, staff: s })}>ویرایش</Button>}
                  {can('staff.delete') && (
                    <Button
                      size="small"
                      danger
                      onClick={() => modal.confirm({ title: `${s.fullName} حذف شود؟`, okButtonProps: { danger: true }, onOk: () => remove.mutateAsync(s.id) })}
                    >
                      حذف
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Section>
      {companyId && (
        <StaffFormModal
          open={form.open}
          staff={form.staff}
          companyId={companyId}
          nextPriority={Math.max(0, ...staff.map((s) => s.priority).filter((p) => p < 999)) + 1}
          onClose={() => setForm({ open: false, staff: null })}
        />
      )}
    </>
  )
}
