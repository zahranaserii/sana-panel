import { DeleteOutlined, DownloadOutlined, EditOutlined, TeamOutlined, UserAddOutlined } from '@ant-design/icons'
import { yupResolver } from '@hookform/resolvers/yup'
import { Button } from 'antd'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useApiMutation, usePermissions } from '@/core'
import { DateField, FormGrid, FormModal, NumberField, TextField } from '@/core/form'
import { faDigits } from '@/core/lib/digits'
import { exportXlsx, readXlsx } from '@/core/lib/excel'
import { formatJalali, parseJalaliString } from '@/core/lib/jalali'
import { Avatar, confirm, DataTable, EmptyState, ImportButton, notify, Page, SectionCard, useDisclosure } from '@/core/ui'
import { staffApi, type StaffInput } from '../../api/staff.api'
import { CompanySelect, useSelectedCompany } from '../../components'
import { sanaKeys, useStaff } from '../../queries'
import type { Staff } from '../../types'
import { STAFF_SAMPLE_HEADERS, STAFF_SAMPLE_ROW, staffSchema, type StaffValues } from './schema'
import { StaffFilters } from './StaffFilters'
import { useStaffFilter } from './useStaffFilter'

export default function StaffPage() {
  const { company, companyId } = useSelectedCompany()
  const { data: staff = [], isLoading } = useStaff(companyId)
  const { can } = usePermissions()
  const filter = useStaffFilter(staff)
  const modal = useDisclosure<Staff>()

  const remove = useApiMutation((id: string) => staffApi.remove(id), { invalidate: [sanaKeys.staffRoot], successMessage: 'حذف شد.' })
  const bulk = useApiMutation((rows: StaffInput[]) => staffApi.bulkCreate(companyId!, rows), {
    invalidate: [sanaKeys.staffRoot],
    successMessage: (r) => `${faDigits(r.added)} نفر اضافه شد.` + (r.skipped.length ? ` ${faDigits(r.skipped.length)} نفر تکراری نادیده گرفته شد.` : ''),
  })

  /** خواندن اکسل، اعتبارسنجی هر ردیف با همان schema فرم و پیش‌نمایش خطاها قبل از ثبت */
  const onImport = async (file: File) => {
    try {
      const rows = (await readXlsx(file)).slice(1).filter((r) => r.some(Boolean))
      const valid: StaffInput[] = []
      const errors: string[] = []
      rows.forEach((cols, i) => {
        try {
          valid.push(
            staffSchema.validateSync({
              fullName: cols[0],
              nationalCode: cols[1],
              mobile: cols[2],
              personnelCode: cols[3],
              hireDate: parseJalaliString(cols[4] ?? ''),
              priority: cols[5] ? Number(cols[5]) : 999,
            }),
          )
        } catch (e) {
          errors.push(`ردیف ${faDigits(i + 2)}: ${(e as Error).message}`)
        }
      })
      if (!rows.length) return void notify.warning('فایل خالی است.')
      const ok = await confirm({
        title: `${faDigits(valid.length)} ردیف معتبر، ${faDigits(errors.length)} ردیف نامعتبر`,
        width: 560,
        okText: 'ثبت ردیف‌های معتبر',
        content: errors.length ? (
          <ul style={{ maxHeight: 240, overflow: 'auto', paddingInlineStart: 18 }}>{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        ) : (
          'همه ردیف‌ها معتبر هستند.'
        ),
      })
      if (ok && valid.length) bulk.mutate(valid)
    } catch {
      notify.error('فایل قابل خواندن نیست. از فایل نمونه (xlsx) استفاده کنید.')
    }
  }

  return (
    <Page
      actions={
        <>
          <CompanySelect />
          {companyId && can('staff.upload') && (
            <Button size="large" icon={<DownloadOutlined />} onClick={() => exportXlsx('نمونه-فایل-پرسنل', STAFF_SAMPLE_HEADERS, [STAFF_SAMPLE_ROW])}>
              فایل نمونه
            </Button>
          )}
          {companyId && can('staff.upload') && <ImportButton accept=".xlsx" label="بارگذاری اکسل" onFile={onImport} loading={bulk.isPending} size="large" />}
          {companyId && can('staff.add') && (
            <Button type="primary" size="large" icon={<UserAddOutlined />} onClick={() => modal.open()}>
              افزودن پرسنل
            </Button>
          )}
        </>
      }
    >
      <SectionCard
        title={company ? `پرسنل ${company.name}` : 'پرسنل'}
        description="فهرست بر اساس اولویت تخصیص مرتب شده است (عدد کوچک‌تر = اولویت بالاتر)."
        icon={<TeamOutlined />}
      >
        {!companyId ? (
          <EmptyState title="ابتدا یک شرکت فعال ثبت کنید" />
        ) : (
          <>
            <StaffFilters f={filter} />
            <DataTable<Staff>
              rowKey="id"
              loading={isLoading}
              data={filter.rows}
              exportAs={{
                filename: `پرسنل-${company?.name}`,
                headers: ['اولویت', 'نام', 'کد ملی', 'موبایل', 'کد پرسنلی', 'تاریخ استخدام'],
                row: (s) => [s.priority, s.fullName, s.nationalCode, s.mobile, s.personnelCode, formatJalali(s.hireDate, false)],
              }}
              empty={{
                title: staff.length ? 'پرسنلی با این شرایط یافت نشد' : 'هنوز پرسنلی ثبت نشده است',
                description: staff.length ? undefined : 'پرسنل را تکی اضافه کنید یا فایل اکسل بارگذاری کنید.',
              }}
              columns={[
                { title: 'اولویت', dataIndex: 'priority', width: 80, align: 'center', render: (p) => <b className="num">{faDigits(p)}</b> },
                {
                  title: 'نام',
                  dataIndex: 'fullName',
                  render: (n: string, s) => (
                    <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
                      <Avatar name={n} size={30} />
                      <span>
                        <div style={{ fontWeight: 600 }}>{n}</div>
                        <div className="hint num">کد پرسنلی {faDigits(s.personnelCode)}</div>
                      </span>
                    </span>
                  ),
                },
                { title: 'کد ملی', dataIndex: 'nationalCode', render: (v) => <span className="num">{faDigits(v)}</span> },
                { title: 'موبایل', dataIndex: 'mobile', render: (v) => <span className="num" dir="ltr">{faDigits(v)}</span> },
                { title: 'تاریخ استخدام', dataIndex: 'hireDate', render: (d) => formatJalali(d), sorter: (a, b) => (a.hireDate ?? '').localeCompare(b.hireDate ?? '') },
              ]}
              rowActions={(s) => [
                { key: 'edit', label: 'ویرایش', icon: <EditOutlined />, onClick: () => modal.open(s), hidden: !can('staff.edit') },
                { key: 'del', label: 'حذف', icon: <DeleteOutlined />, danger: true, confirm: `${s.fullName} حذف شود؟`, onClick: () => remove.mutate(s.id), hidden: !can('staff.delete') },
              ]}
            />
          </>
        )}
      </SectionCard>
      {companyId && (
        <StaffModal
          open={modal.isOpen}
          staff={modal.data}
          companyId={companyId}
          nextPriority={Math.max(0, ...staff.map((s) => s.priority).filter((p) => p < 999)) + 1}
          onClose={modal.close}
        />
      )}
    </Page>
  )
}

function StaffModal({ open, companyId, staff, nextPriority, onClose }: { open: boolean; companyId: string; staff: Staff | null; nextPriority: number; onClose: () => void }) {
  const form = useForm<StaffValues>({ resolver: yupResolver(staffSchema) })
  useEffect(() => {
    if (!open) return
    form.reset(
      staff
        ? { ...staff, hireDate: staff.hireDate ?? undefined }
        : { fullName: '', nationalCode: '', mobile: '', personnelCode: '', hireDate: undefined, priority: nextPriority },
    )
  }, [open, staff, nextPriority, form])

  const save = useApiMutation((input: StaffInput) => (staff ? staffApi.update(staff.id, input) : staffApi.create(companyId, input)), {
    invalidate: [sanaKeys.staffRoot],
    successMessage: staff ? 'تغییرات پرسنل ذخیره شد.' : 'پرسنل ثبت شد.',
  })
  const c = form.control
  return (
    <FormModal
      open={open}
      onClose={onClose}
      form={form}
      width={640}
      title={staff ? `ویرایش ${staff.fullName}` : 'افزودن پرسنل'}
      submitText={staff ? 'ذخیره تغییرات' : 'ثبت پرسنل'}
      loading={save.isPending}
      onSubmit={(v) => save.mutate(v, { onSuccess: onClose })}
    >
      <FormGrid min={250}>
        <TextField control={c} name="fullName" label="نام و نام خانوادگی" required />
        <TextField control={c} name="nationalCode" label="کد ملی" required inputProps={{ inputMode: 'numeric', maxLength: 10, dir: 'ltr' }} />
        <TextField control={c} name="mobile" label="موبایل" required placeholder="09xxxxxxxxx" inputProps={{ inputMode: 'tel', maxLength: 11, dir: 'ltr' }} />
        <TextField control={c} name="personnelCode" label="کد پرسنلی" required />
        <DateField control={c} name="hireDate" label="تاریخ استخدام" required />
        <NumberField control={c} name="priority" label="اولویت تخصیص" required extra="عدد کوچک‌تر = اولویت بالاتر" inputProps={{ min: 1 }} />
      </FormGrid>
    </FormModal>
  )
}
