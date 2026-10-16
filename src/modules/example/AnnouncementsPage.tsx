/**
 * صفحه نمونه CRUD — الگوی پیشنهادی برای هر صفحه جدید:
 *   useQuery  → DataTable (جستجو، فیلتر، خروجی، اکشن ردیف)
 *   useForm + yup → FormDrawer (با هشدار تغییرات ذخیره‌نشده)
 *   useApiMutation → پیام موفقیت + invalidate خودکار
 */
import { DeleteOutlined, EditOutlined, PlusOutlined, PushpinFilled } from '@ant-design/icons'
import { yupResolver } from '@hookform/resolvers/yup'
import { useQuery } from '@tanstack/react-query'
import { Button, Tag } from 'antd'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import { useApiMutation, usePermissions } from '@/core'
import { DateField, FormDrawer, FormGrid, RadioField, requiredMsg, SwitchField, TextAreaField, TextField } from '@/core/form'
import { formatJalali, todayISO } from '@/core/lib/jalali'
import { DataTable, Page, SectionCard, useDisclosure } from '@/core/ui'
import { type Announcement, type AnnouncementInput, announcementsApi } from './api'

const keys = { list: ['example', 'announcements'] as const }

const PRIORITY = { low: { label: 'کم', color: 'default' }, normal: { label: 'عادی', color: 'blue' }, high: { label: 'مهم', color: 'red' } } as const

const schema = yup.object({
  title: yup.string().trim().required(requiredMsg).max(120),
  body: yup.string().trim().required(requiredMsg).max(500),
  priority: yup.mixed<Announcement['priority']>().oneOf(['low', 'normal', 'high']).required(),
  publishDate: yup.string().required(requiredMsg),
  pinned: yup.boolean().required(),
})
type Values = yup.InferType<typeof schema>

export default function AnnouncementsPage() {
  const { can } = usePermissions()
  const { data, isLoading } = useQuery({ queryKey: keys.list, queryFn: announcementsApi.list })
  const drawer = useDisclosure<Announcement>()
  const remove = useApiMutation((id: string) => announcementsApi.remove(id), { invalidate: [keys.list], successMessage: 'حذف شد.' })

  return (
    <Page
      actions={
        can('notices.edit') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => drawer.open()}>
            اطلاعیه جدید
          </Button>
        )
      }
    >
      <SectionCard>
        <DataTable<Announcement>
          rowKey="id"
          loading={isLoading}
          data={data}
          searchText={(a) => `${a.title} ${a.body}`}
          exportAs={{ filename: 'اطلاعیه‌ها', headers: ['عنوان', 'متن', 'تاریخ'], row: (a) => [a.title, a.body, formatJalali(a.publishDate, false)] }}
          empty={{ title: 'اطلاعیه‌ای وجود ندارد' }}
          columns={[
            { title: 'عنوان', dataIndex: 'title', render: (t, a) => <b>{a.pinned && <PushpinFilled style={{ color: 'var(--c-accent)' }} />} {t}</b> },
            { title: 'متن', dataIndex: 'body', ellipsis: true },
            { title: 'اهمیت', dataIndex: 'priority', render: (p: Announcement['priority']) => <Tag color={PRIORITY[p].color}>{PRIORITY[p].label}</Tag> },
            { title: 'انتشار', dataIndex: 'publishDate', render: (d) => formatJalali(d) },
            { title: 'نویسنده', dataIndex: 'author' },
          ]}
          rowActions={(a) => [
            { key: 'edit', label: 'ویرایش', icon: <EditOutlined />, onClick: () => drawer.open(a), hidden: !can('notices.edit') },
            { key: 'del', label: 'حذف', icon: <DeleteOutlined />, danger: true, confirm: 'حذف شود؟', onClick: () => remove.mutate(a.id), hidden: !can('notices.edit') },
          ]}
        />
      </SectionCard>
      <AnnouncementDrawer open={drawer.isOpen} item={drawer.data} onClose={drawer.close} />
    </Page>
  )
}

function AnnouncementDrawer({ open, item, onClose }: { open: boolean; item: Announcement | null; onClose: () => void }) {
  const form = useForm<Values>({ resolver: yupResolver(schema) })
  useEffect(() => {
    if (open) form.reset(item ?? { title: '', body: '', priority: 'normal', publishDate: todayISO(), pinned: false })
  }, [open, item, form])
  const save = useApiMutation((v: AnnouncementInput) => (item ? announcementsApi.update(item.id, v) : announcementsApi.create(v)), {
    invalidate: [keys.list],
    successMessage: 'ذخیره شد.',
  })
  const c = form.control
  return (
    <FormDrawer open={open} onClose={onClose} form={form} title={item ? 'ویرایش اطلاعیه' : 'اطلاعیه جدید'} loading={save.isPending} onSubmit={(v) => save.mutate(v, { onSuccess: onClose })}>
      <TextField control={c} name="title" label="عنوان" required />
      <TextAreaField control={c} name="body" label="متن" required inputProps={{ rows: 5 }} />
      <FormGrid>
        <RadioField control={c} name="priority" label="اهمیت" options={Object.entries(PRIORITY).map(([value, p]) => ({ value, label: p.label }))} />
        <DateField control={c} name="publishDate" label="تاریخ انتشار" required />
        <SwitchField control={c} name="pinned" label="سنجاق در بالای فهرست" />
      </FormGrid>
    </FormDrawer>
  )
}
